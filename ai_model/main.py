"""
GrievancePortal — AI Image Classification Model with Validation Layer
======================================================================
FastAPI server that validates and classifies municipal complaint images.

New Architecture
----------------
1. Image Upload → 2. AI Validation Layer → 3. Category Classification
   - Validation uses CLIP to detect if image is a valid municipal issue
   - Rejects irrelevant images (selfies, animals, food, etc.)
   - Only valid images proceed to MobileNetV3 classification

Supported categories
--------------------
  Damaged Road Issue | Fallen Trees | Garbage and Trash Issue
  Illegal Drawing on Walls | Street Light Issue | Other

Quick start
-----------
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import io
import os
import logging
from pathlib import Path
from typing import Optional, Tuple

import torch
import torch.nn as nn
import torchvision.transforms as T
from torchvision import models
from PIL import Image
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import clip

# ─── Config ───────────────────────────────────────────────────────────────────

CATEGORIES = [
    "Damaged Road Issue",
    "Fallen Trees",
    "Garbage and Trash Issue",
    "Illegal Drawing on Walls",
    "Street Light Issue",
    "Other"
]
NUM_CLASSES = len(CATEGORIES)
MODEL_WEIGHTS_PATH = Path(os.getenv("MODEL_WEIGHTS", "weights/classifier.pt"))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
IMG_SIZE = 224

# Validation thresholds
VALIDATION_THRESHOLD = 0.20  # Minimum similarity score for valid municipal images
REJECTION_THRESHOLD = 0.35   # Maximum similarity score for invalid images to be rejected

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("classifier")

# ─── CLIP Validation Prompts ─────────────────────────────────────────────────

# Images that SHOULD be accepted (municipal issues)
VALID_PROMPTS = [

    # Damaged Road Issue
    "a road with potholes",
    "a damaged road surface with cracks",
    "a broken street with potholes",
    "a damaged asphalt road",
    "a road with large potholes",
    "a cracked road or pavement",
    "a damaged highway or street",
    "a broken road infrastructure",
    "a road with uneven surface damage",
    "a damaged city road requiring repair",

    # Garbage and Trash Issue
    "garbage piled on the street",
    "trash scattered on the roadside",
    "overflowing garbage bins in public area",
    "municipal waste dumped on the street",
    "trash bags and litter on the road",
    "dirty street with garbage everywhere",
    "uncollected garbage in a public place",
    "garbage accumulation near buildings",
    "street filled with plastic waste",
    "waste disposal problem in city streets",

    # Street Light Issue
    "a broken street light pole",
    "a street lamp not working at night",
    "damaged street lighting infrastructure",
    "street light pole leaning or broken",
    "electric wiring problem on street pole",
    "street lamp damaged or hanging",
    "public street light malfunction",
    "broken lighting pole on roadside",
    "street light infrastructure issue",
    "damaged electrical pole on street",

    # Fallen Trees
    "a fallen tree blocking the road",
    "tree branches fallen on street",
    "a large tree collapsed after storm",
    "broken tree blocking traffic",
    "tree fallen on roadside",
    "uprooted tree lying on the street",
    "fallen tree obstructing pathway",
    "storm damaged tree on road",
    "large tree branch blocking road",
    "fallen tree causing road blockage",

    # Illegal Drawing on Walls
    "graffiti on public wall",
    "illegal spray paint on city wall",
    "vandalized wall with graffiti art",
    "public property wall with spray paint",
    "graffiti on building exterior",
    "defaced wall with paint markings",
    "illegal drawings on wall surface",
    "street wall vandalized with graffiti",
    "painted graffiti on roadside wall",
    "public wall covered with graffiti",

    # General municipal infrastructure issues
    "damaged public infrastructure in city",
    "urban infrastructure damage",
    "municipal civic problem on street",
    "public infrastructure maintenance issue",
    "city maintenance problem on road",
]

# Images that SHOULD be rejected (not municipal issues)
INVALID_PROMPTS = [

    # People / Selfies / Celebrities
    "a selfie of a person",
    "a portrait photo of a person",
    "a close-up face of a human",
    "a group of people posing for a photo",
    "a celebrity photograph",
    "a famous actor or public figure",
    "a person taking a selfie with a phone",
    "a human face looking at the camera",
    "a person standing indoors",
    "a human portrait photograph",

    # Animals / Pets
    "a dog or puppy",
    "a cat or kitten",
    "a pet animal inside a home",
    "a wild animal in nature",
    "a bird sitting on a branch",
    "animals walking on grass",
    "a horse or cow in a field",
    "a wildlife photograph of animals",
    "a pet animal posing for a photo",
    "a bird flying in the sky",

    # Food / Meals
    "a plate of food",
    "a restaurant meal or dish",
    "a bowl of food on a table",
    "a close-up food photograph",
    "a cooked meal ready to eat",
    "a dessert or sweet dish",
    "a pizza or burger meal",
    "a dining table with food",
    "a kitchen prepared meal",
    "a food photography image",

    # Indoor Scenes
    "an indoor room or bedroom",
    "a living room interior",
    "an office workspace desk",
    "an indoor home environment",
    "furniture inside a house",
    "a classroom interior",
    "an office meeting room",
    "a hallway or corridor indoors",

    # Vehicles / Transport
    "a car interior dashboard",
    "a motorcycle or bike",
    "a vehicle parked in a garage",
    "a car driving on a road",
    "a bus or truck vehicle",
    "a train or railway vehicle",

    # Landscapes / Nature
    "a mountain landscape",
    "a scenic nature view",
    "a sunset or sunrise landscape",
    "a forest or jungle scenery",
    "a beach or ocean view",
    "a river or lake in nature",
    "a nature photograph of trees and sky",
    "a countryside landscape",

    # Random Objects / Products
    "a random household object",
    "a consumer product on a table",
    "an electronic device or gadget",
    "a mobile phone product photo",
    "a shopping item or product display",
    "tools or equipment on a table",

    # Screenshots / Documents
    "a screenshot of a mobile screen",
    "a screenshot of a computer screen",
    "a document page with text",
    "a printed paper document",
    "a digital interface screenshot",
    "a website screenshot",
    "a chat or messaging screenshot",

    # Cartoons / Memes / Illustrations
    "a meme image from the internet",
    "a cartoon illustration",
    "a comic drawing",
    "an animated character",
    "a digital artwork or illustration",
    "a funny meme picture",

    # Abstract / Artistic Images
    "abstract colorful patterns",
    "modern abstract art painting",
    "random geometric shapes",
    "color gradient background",
    "texture pattern artwork",

    # Monochrome / Low-information Images
    "a blank white image",
    "a completely black image",
    "a monochrome grayscale photo",
    "a plain background image",
    "a blurry or unfocused image",
    "an extremely dark photograph",
]

# ─── Model Definitions ────────────────────────────────────────────────────────


def build_classifier_model() -> nn.Module:
    """
    MobileNetV3-Small with the SAME classifier head used during training.
    This must exactly match train.py architecture to load weights correctly.
    """

    # Do not load ImageNet weights when loading trained weights
    model = models.mobilenet_v3_small(weights=None)

    # Get input feature size (576 for MobileNetV3-Small)
    in_features = model.classifier[0].in_features

    # Replace classifier with the deeper head used in training
    model.classifier = nn.Sequential(
        nn.Linear(in_features, 512),
        nn.BatchNorm1d(512),
        nn.ReLU(),
        nn.Dropout(0.4),

        nn.Linear(512, 256),
        nn.BatchNorm1d(256),
        nn.ReLU(),
        nn.Dropout(0.3),

        nn.Linear(256, NUM_CLASSES)
    )

    return model


# ─── Inference Transform ──────────────────────────────────────────────────────

_transform = T.Compose([
    T.Resize((IMG_SIZE, IMG_SIZE)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]),
])


def _confidence_label(prob: float) -> str:
    if prob >= 0.70:
        return "high"
    if prob >= 0.40:
        return "medium"
    if prob >= 0.20:
        return "low"
    return "none"


# ─── Load Models ──────────────────────────────────────────────────────────────

classifier_model: Optional[nn.Module] = None
clip_model: Optional[nn.Module] = None
clip_preprocess = None
valid_text_features = None
invalid_text_features = None


def load_classifier_model() -> nn.Module:
    """Load the MobileNetV3 classification model"""

    m = build_classifier_model()

    if MODEL_WEIGHTS_PATH.exists():
        log.info(f"Loading fine-tuned weights from {MODEL_WEIGHTS_PATH}")
        state = torch.load(MODEL_WEIGHTS_PATH, map_location=DEVICE)
        m.load_state_dict(state, strict=True)
    else:
        log.warning(
            "Fine-tuned weights not found — using randomly initialized model. "
            "Run python train.py to train the model."
        )

    m.to(DEVICE)
    m.eval()

    return m


def load_clip_validator():
    """
    Load CLIP model for image validation.
    Returns: (clip_model, preprocess, valid_features, invalid_features)
    """
    log.info("Loading CLIP model for validation...")
    
    # Load CLIP model (RN50 is lightweight and fast)
    model, preprocess = clip.load("RN50", device=DEVICE)
    model.eval()
    
    # Encode text prompts
    with torch.no_grad():
        valid_tokens = clip.tokenize(VALID_PROMPTS).to(DEVICE)
        invalid_tokens = clip.tokenize(INVALID_PROMPTS).to(DEVICE)
        
        valid_features = model.encode_text(valid_tokens)
        invalid_features = model.encode_text(invalid_tokens)
        
        # Normalize features
        valid_features = valid_features / valid_features.norm(dim=-1, keepdim=True)
        invalid_features = invalid_features / invalid_features.norm(dim=-1, keepdim=True)
    
    log.info("CLIP model loaded successfully")
    return model, preprocess, valid_features, invalid_features


# ─── Validation Function ──────────────────────────────────────────────────────


def validate_image(pil_img: Image.Image) -> Tuple[bool, float, str]:
    """
    Validate if the image represents a valid municipal complaint.
    
    Returns:
        (is_valid, confidence_score, reason)
    
    Validation Logic:
        1. Compute CLIP similarity with valid prompts (municipal issues)
        2. Compute CLIP similarity with invalid prompts (selfies, animals, etc.)
        3. If invalid_score > REJECTION_THRESHOLD → REJECT
        4. If valid_score < VALIDATION_THRESHOLD → REJECT
        5. Otherwise → ACCEPT
    """
    if clip_model is None:
        log.warning("CLIP model not loaded, skipping validation")
        return True, 1.0, "Validation skipped (model not loaded)"
    
    try:
        # Preprocess image for CLIP
        image_input = clip_preprocess(pil_img).unsqueeze(0).to(DEVICE)
        
        # Encode image
        with torch.no_grad():
            image_features = clip_model.encode_image(image_input)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            # Compute similarities
            valid_similarities = (image_features @ valid_text_features.T).squeeze(0)
            invalid_similarities = (image_features @ invalid_text_features.T).squeeze(0)
            
            # Get max scores
            valid_score = valid_similarities.max().item()
            invalid_score = invalid_similarities.max().item()
            
            # Get best matching prompts
            valid_idx = valid_similarities.argmax().item()
            invalid_idx = invalid_similarities.argmax().item()
            
            best_valid_prompt = VALID_PROMPTS[valid_idx]
            best_invalid_prompt = INVALID_PROMPTS[invalid_idx]
        
        log.info(f"[validation] valid_score={valid_score:.3f} ({best_valid_prompt[:50]}...)")
        log.info(f"[validation] invalid_score={invalid_score:.3f} ({best_invalid_prompt[:50]}...)")
        
        # Decision logic
        if invalid_score > REJECTION_THRESHOLD:
            reason = f"Image appears to be: {best_invalid_prompt}"
            log.warning(f"[validation] REJECTED - {reason}")
            return False, invalid_score, reason
        
        if valid_score < VALIDATION_THRESHOLD:
            reason = "Image does not appear to represent a valid municipal issue"
            log.warning(f"[validation] REJECTED - Low confidence ({valid_score:.3f})")
            return False, valid_score, reason
        
        # Calculate relative confidence (how much more valid than invalid)
        confidence = valid_score - invalid_score
        
        log.info(f"[validation] ACCEPTED - Confidence: {confidence:.3f}")
        return True, confidence, f"Image matches: {best_valid_prompt}"
        
    except Exception as e:
        log.error(f"[validation] Error during validation: {e}")
        # On error, allow the image to proceed (fail-open)
        return True, 0.5, f"Validation error: {str(e)}"


# ─── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="GrievancePortal Image Classifier with Validation",
    description="Validates and classifies municipal issue images into predefined categories.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    global classifier_model, clip_model, clip_preprocess, valid_text_features, invalid_text_features
    
    log.info(f"Loading models on device={DEVICE}")
    
    # Load classifier model
    classifier_model = load_classifier_model()
    
    # Load CLIP validation model
    clip_model, clip_preprocess, valid_text_features, invalid_text_features = load_clip_validator()
    
    log.info("All models ready.")


# ─── Schemas ──────────────────────────────────────────────────────────────────


class ClassifyResponse(BaseModel):
    category: str
    raw_label: str
    confidence: str          # "high" | "medium" | "low" | "none"
    confidence_score: float  # 0.0 – 1.0
    all_scores: dict         # category → probability
    validation: dict         # validation metadata


class ValidationError(BaseModel):
    error: str
    message: str
    validation: dict


# ─── Routes ───────────────────────────────────────────────────────────────────


@app.get("/health")
def health():
    return {
        "status": "ok",
        "device": DEVICE,
        "classifier_loaded": classifier_model is not None,
        "validator_loaded": clip_model is not None,
        "validation_threshold": VALIDATION_THRESHOLD,
        "rejection_threshold": REJECTION_THRESHOLD,
    }


@app.post("/classify", response_model=ClassifyResponse)
async def classify(image: UploadFile = File(...)):
    """
    Accept a JPEG/PNG image upload, validate it, and return the predicted complaint category.
    
    Workflow:
    1. Validate file format
    2. AI Validation Layer (CLIP-based)
    3. If valid → Category Classification (MobileNetV3)
    4. If invalid → Reject with error message
    """
    if classifier_model is None:
        raise HTTPException(status_code=503, detail="Classifier model not loaded yet.")

    # Validate content type
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    raw_bytes = await image.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file received.")

    try:
        pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Cannot decode image: {exc}")

    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 1: AI VALIDATION LAYER
    # ═══════════════════════════════════════════════════════════════════════════
    
    is_valid, validation_score, validation_reason = validate_image(pil_img)
    
    if not is_valid:
        log.warning(f"[classify] Image rejected by validation layer: {validation_reason}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_image",
                "message": "The uploaded image does not appear to represent a valid municipal issue.",
                "validation": {
                    "is_valid": False,
                    "score": round(validation_score, 4),
                    "reason": validation_reason,
                }
            }
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # STEP 2: CATEGORY CLASSIFICATION
    # ═══════════════════════════════════════════════════════════════════════════
    
    # Run inference
    tensor = _transform(pil_img).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        logits = classifier_model(tensor)           # [1, NUM_CLASSES]
        probs = torch.softmax(logits, dim=1)[0]     # [NUM_CLASSES]

    probs_list = probs.cpu().tolist()
    top_idx = int(torch.argmax(probs).item())
    top_prob = probs_list[top_idx]
    top_cat = CATEGORIES[top_idx]

    all_scores = {cat: round(prob, 4) for cat, prob in zip(CATEGORIES, probs_list)}

    log.info(
        f"[classify] ✓ VALIDATED → category={top_cat}  "
        f"confidence={_confidence_label(top_prob)}  "
        f"score={top_prob:.3f}"
    )

    return ClassifyResponse(
        category=top_cat,
        raw_label=top_cat.replace("_", " ").title(),
        confidence=_confidence_label(top_prob),
        confidence_score=round(top_prob, 4),
        all_scores=all_scores,
        validation={
            "is_valid": True,
            "score": round(validation_score, 4),
            "reason": validation_reason,
        }
    )


@app.post("/validate-only")
async def validate_only(image: UploadFile = File(...)):
    """
    Validate image without classification (for testing validation layer).
    """
    if clip_model is None:
        raise HTTPException(status_code=503, detail="Validation model not loaded yet.")

    raw_bytes = await image.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file received.")

    try:
        pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Cannot decode image: {exc}")

    is_valid, validation_score, validation_reason = validate_image(pil_img)

    return {
        "is_valid": is_valid,
        "score": round(validation_score, 4),
        "reason": validation_reason,
        "threshold": {
            "validation": VALIDATION_THRESHOLD,
            "rejection": REJECTION_THRESHOLD,
        }
    }
