const errorHandler = (err, req, res, next) => {
    const error = {
      status: err.status || 500,
      message: err.message || 'Internal Server Error',
    };
  
    if (err.name === 'ValidationError') {
      error.status = 400;
      error.message = Object.values(err.errors).map(val => val.message);
    }
  
    if (err.code === 11000) {
      error.status = 400;
      error.message = 'This email is already registered';
    }
  
    res.status(error.status).json({
      success: false,
      error: error.message
    });
  };
  
  module.exports = errorHandler;