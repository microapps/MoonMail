export class ApiErrors {
  static get errors() {
    return {
      invalidToken: new Error('[401] Missing or invalid Access Token')
    };
  }

  static response(error) {
    if (this._isAuthError(error)) {
      console.log('auth')
      return this._authResponse();
    } else {
      console.log('default auth')
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
    return {status: 400, message: error.message || error };
  }

  static _authResponse() {
    return this.errors.invalidToken;
  }
}
