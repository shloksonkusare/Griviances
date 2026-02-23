const Citizen = require('../models/Citizen');

/**
 * Citizen authentication middleware
 */
const citizenAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Find citizen with this session token
    const citizen = await Citizen.findOne({
      'sessions.token': token,
      'sessions.isActive': true,
    });

    if (!citizen) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
      });
    }

    if (citizen.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account blocked',
      });
    }

    // Update last used
    const session = citizen.sessions.find(s => s.token === token);
    if (session) {
      session.lastUsedAt = new Date();
      await citizen.save();
    }

    req.citizen = citizen;
    req.token = token;
    next();
  } catch (error) {
    console.error('Citizen auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Optional citizen auth - doesn't fail if not authenticated
 */
const optionalCitizenAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      const citizen = await Citizen.findOne({
        'sessions.token': token,
        'sessions.isActive': true,
      });

      if (citizen && !citizen.isBlocked) {
        req.citizen = citizen;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

module.exports = { citizenAuth, optionalCitizenAuth };
