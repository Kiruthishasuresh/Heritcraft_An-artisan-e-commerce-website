import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";
import { initEncryption, encryptPassword } from "../utils/encryption";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem("heritcraft_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      // Remove old persistent login data from previous localStorage version
      localStorage.removeItem("heritcraft_token");
      localStorage.removeItem("heritcraft_user");

      const savedToken = sessionStorage.getItem("heritcraft_token");

      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.getMe();
        const userData = response.data;

        setUser(userData);
        setToken(savedToken);
        sessionStorage.setItem("heritcraft_user", JSON.stringify(userData));
      } catch (error) {
        sessionStorage.removeItem("heritcraft_token");
        sessionStorage.removeItem("heritcraft_user");
        localStorage.removeItem("heritcraft_token");
        localStorage.removeItem("heritcraft_user");

        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateSession();

    // Pre-load public key in the background
    initEncryption(authAPI.getPublicKey);
  }, []);

  /**
   * Login — stores JWT and user data in sessionStorage.
   * Does NOT redirect — caller handles navigation.
   */
  const login = async (email, password) => {
    try {
      await initEncryption(authAPI.getPublicKey);
      const encPassword = encryptPassword(password);

      const response = await authAPI.login({ email, password: encPassword });
      const data = response.data;

      if (data.phoneVerificationRequired) {
        return data;
      }

      if (!data.token) {
        throw new Error("No token received from server");
      }

      // Store login session only in sessionStorage
      sessionStorage.setItem("heritcraft_token", data.token);
      sessionStorage.setItem("heritcraft_user", JSON.stringify(data));

      // Remove old persistent login data
      localStorage.removeItem("heritcraft_token");
      localStorage.removeItem("heritcraft_user");

      // Save safe recent account data only
      saveRecentAccount(data);

      setToken(data.token);
      setUser(data);

      return {
        token: data.token,
        user: data,
      };
    } catch (error) {
      throw new Error(
        error.response?.data?.message || error.message || "Login failed"
      );
    }
  };

  /**
   * Register — stores JWT and user data in sessionStorage for non-seller signups.
   * Seller registration returns pendingApproval without token.
   */
  const register = async (formData) => {
    try {
      await initEncryption(authAPI.getPublicKey);
      const encPassword = encryptPassword(formData.password);

      const secureData = { ...formData, password: encPassword };
      const response = await authAPI.register(secureData);
      const data = response.data;

      return {
        token: null,
        user: data,
      };
    } catch (error) {
      throw new Error(
        error.response?.data?.message || error.message || "Registration failed"
      );
    }
  };

  const logout = () => {
    // Clear current session
    sessionStorage.removeItem("heritcraft_token");
    sessionStorage.removeItem("heritcraft_user");

    // Clear old persistent auth data if present
    localStorage.removeItem("heritcraft_token");
    localStorage.removeItem("heritcraft_user");

    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    sessionStorage.setItem("heritcraft_user", JSON.stringify(updatedUser));
  };

  /**
   * Get recent accounts from sessionStorage.
   * Cleans old unsafe password fields if present.
   */
  const getRecentAccounts = () => {
    try {
      const saved = sessionStorage.getItem("heritcraft_recent_accounts");
      const accounts = saved ? JSON.parse(saved) : [];

      const cleanedAccounts = accounts.map((account) => ({
        name: account.name,
        email: account.email,
        role: account.role,
      }));

      sessionStorage.setItem(
        "heritcraft_recent_accounts",
        JSON.stringify(cleanedAccounts)
      );

      return cleanedAccounts;
    } catch {
      sessionStorage.removeItem("heritcraft_recent_accounts");
      return [];
    }
  };

  /**
   * Save account to recent accounts list.
   * Never stores password.
   */
  const saveRecentAccount = (userData) => {
    try {
      const accounts = getRecentAccounts();
      const filtered = accounts.filter((a) => a.email !== userData.email);

      filtered.unshift({
        name: userData.name,
        email: userData.email,
        role: userData.role,
      });

      sessionStorage.setItem(
        "heritcraft_recent_accounts",
        JSON.stringify(filtered.slice(0, 5))
      );
    } catch {
      // ignore storage errors
    }
  };

  /**
   * Remove an account from recent accounts.
   */
  const removeRecentAccount = (email) => {
    try {
      const accounts = getRecentAccounts();
      const filtered = accounts.filter((a) => a.email !== email);

      sessionStorage.setItem(
        "heritcraft_recent_accounts",
        JSON.stringify(filtered)
      );
    } catch {
      // ignore storage errors
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        setUser,
        getRecentAccounts,
        removeRecentAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};