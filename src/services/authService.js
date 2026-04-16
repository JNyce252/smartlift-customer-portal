import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';

const AUTH_STORAGE_KEY = 'smartlift_auth';
const poolData = {
  UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
  ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
};
const userPool = new CognitoUserPool(poolData);

class AuthService {
  async login(email, password) {
    return new Promise((resolve, reject) => {
      const authenticationData = { Username: email, Password: password };
      const authenticationDetails = new AuthenticationDetails(authenticationData);
      const userData = { Username: email, Pool: userPool };
      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          const payload = result.getIdToken().payload;
          const groups = payload['cognito:groups'] || [];
          let role = 'staff';
          if (groups.includes('Customers')) role = 'customer';
          else if (groups.includes('Owners')) role = 'owner';
          else if (groups.includes('Technicians')) role = 'technician';
          else if (groups.includes('SalesOffice')) role = 'sales';
          else if (groups.includes('CompanyUsers')) role = 'staff';
          const user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || email.split('@')[0],
            role, groups,
            token: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
          };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
          resolve(user);
        },
        onFailure: (err) => reject(new Error(err.message || 'Login failed')),
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          // Auto-complete the password change with the same password
          delete userAttributes.email_verified;
          delete userAttributes.email;
          
          cognitoUser.completeNewPasswordChallenge(password, userAttributes, {
            onSuccess: (result) => {
              const payload = result.getIdToken().payload;
              const groups = payload['cognito:groups'] || [];
              let role = groups.includes('CompanyUsers') ? 'company' : 'customer';
              const user = {
                id: payload.sub,
                email: payload.email,
                name: payload.name || email.split('@')[0],
                role, groups,
                token: result.getAccessToken().getJwtToken(),
                idToken: result.getIdToken().getJwtToken(),
              };
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
              resolve(user);
            },
            onFailure: (err) => reject(new Error(err.message || 'Password change failed')),
          });
        },
      });
    });
  }

  async register(email, password, userType, additionalData = {}) {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name', Value: additionalData.name || '' }),
      ];
      userPool.signUp(email, password, attributeList, null, (err) => {
        if (err) {
          reject(new Error(err.message));
          return;
        }
        this.login(email, password).then(resolve).catch(reject);
      });
    });
  }

  async logout() {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) cognitoUser.signOut();
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  async getCurrentUser() {
    return new Promise((resolve) => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) { resolve(null); return; }
      cognitoUser.getSession((err, session) => {
        if (err || !session.isValid()) { resolve(null); return; }
        cognitoUser.getUserAttributes((err) => {
          if (err) { resolve(null); return; }
          const payload = session.getIdToken().payload;
          const groups = payload['cognito:groups'] || [];
          let role = 'staff';
          if (groups.includes('Customers')) role = 'customer';
          else if (groups.includes('Owners')) role = 'owner';
          else if (groups.includes('Technicians')) role = 'technician';
          else if (groups.includes('SalesOffice')) role = 'sales';
          else if (groups.includes('CompanyUsers')) role = 'staff';
          const user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
            role, groups,
            token: session.getAccessToken().getJwtToken(),
            idToken: session.getIdToken().getJwtToken(),
          };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
          resolve(user);
        });
      });
    });
  }

  getToken() {
    const userStr = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr)?.token;
  }
}

export const authService = new AuthService();
