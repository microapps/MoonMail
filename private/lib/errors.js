import 'babel-polyfill';

// New Api


// Old Api
class ApiErrors {
  static get errors() {
    return {
      invalidToken: {
        message: 'Missing or invalid JWT',
        status: 401
      }
    };
  }

  static response(error) {
    if (this._isAuthError(error)) {
      return this._authResponse();
    } else {
      return this._defaultResponse(error);
    }
  }

  static _isAuthError(error) {
    const errorName = error.name;
    const authErrorNames = ['TokenExpiredError', 'JsonWebTokenError'];
    if (errorName && authErrorNames.includes(errorName)) {
      return true;
    } else {
      return false;
    }
  }

  static _defaultResponse(error) {
    return JSON.stringify({status: error.status || 400, message: error.message || error });
  }

  static _authResponse() {
    return JSON.stringify(this.errors.invalidToken);
  }
}

class ExtendableError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.stack = (new Error()).stack;
  }
}

class QuotaExceeded extends ExtendableError {
  constructor(m) {
    super(m);
    this.name = 'QuotaExceeded';
  }
}

class NonExistingSender extends ExtendableError {
  constructor(m) {
    super(m);
    this.name = 'NonExistingSender';
  }
}

class BadReputation extends ExtendableError {
  constructor(m) {
    super(m);
    this.name = 'BadReputation';
  }
}

class SenderAlreadyExists extends ExtendableError {
  constructor(m) {
    super(m);
    this.name = 'SenderAlreadyExists';
  }
}

class StripeChargeError extends ExtendableError {
  constructor(m) {
    super(m);
    this.name = 'StripeChargeError';
  }
}

class SandboxMode extends ExtendableError {
  constructor(m) {
    super(m);
    this.name = 'SandboxMode';
  }
}

class RecipientAlreadyExists extends ExtendableError {
  constructor(m) {
    super(m);
    this.name = 'RecipientAlreadyExists';
  }
}

module.exports.RecipientAlreadyExists = RecipientAlreadyExists;
module.exports.QuotaExceeded = QuotaExceeded;
module.exports.NonExistingSender = NonExistingSender;
module.exports.SenderAlreadyExists = SenderAlreadyExists;
module.exports.BadReputation = BadReputation;
module.exports.SandboxMode = SandboxMode;
module.exports.StripeChargeError = StripeChargeError;
module.exports.ApiErrors = ApiErrors;
