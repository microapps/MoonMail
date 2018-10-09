export default class ApiErrors {
  static get errors() {
    return {
      invalidToken: {
        message: 'Missing or invalid JWT',
        statusCode: 401
      },
      accessDenied: {
        message: 'Access Denied',
        statusCode: 403
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
    return {statusCode: error.statusCode || 400, message: error.message || error };
  }

  static _authResponse() {
    return this.errors.invalidToken;
  }
}
