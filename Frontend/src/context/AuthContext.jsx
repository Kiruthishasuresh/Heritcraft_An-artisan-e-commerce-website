import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";
import { initEncryption, encryptPassword } from "../utils/encryption";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("heritcraft_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const savedToken = localStorage.getItem("heritcraft_token");

      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.getMe();
        const userData = response.data;

        setUser(userData);
        setToken(savedToken);
        localStorage.setItem("heritcraft_user", JSON.stringify(userData));
      } catch (error) {
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
   * Login — stores JWT and user data, returns result.
   * Does NOT redirect — caller handles navigation.
   */
  const login = async (email, password) => {
    try {
      await initEncryption(authAPI.getPublicKey);
      const encPassword = encryptPassword(password);
      
      const response = await authAPI.login({ email, password: encPassword });
      const data = response.data;

      if (!data.token) {
        throw new Error("No token received from server");
      }

      localStorage.setItem("heritcraft_token", data.token);
      localStorage.setItem("heritcraft_user", JSON.stringify(data));

      // Save to recent accounts
      saveRecentAccount(data);

      setToken(data.token);
      setUser(data);

      return {
        token: data.token,
        user: data,
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || "Login failed");
    }
  };

  /**
   * Register — stores JWT and user data for non-seller signups.
   * Seller registration returns pendingApproval without token.
   */
  const register = async (formData) => {
    try {
      await initEncryption(authAPI.getPublicKey);
      const encPassword = encryptPassword(formData.password);
      
      const secureData = { ...formData, password: encPassword };
      const response = await authAPI.register(secureData);
      const data = response.data;

      if (data.pendingApproval || (formData.role === "seller" && !data.token)) {
        return {
          token: null,
          user: data,
          pendingApproval: true,
        };
      }

      if (!data.token) {
        throw new Error("No token received from server");
      }

      localStorage.setItem("heritcraft_token", data.token);
      localStorage.setItem("heritcraft_user", JSON.stringify(data));

      saveRecentAccount(data);

      setToken(data.token);
      setUser(data);

      return {
        token: data.token,
        user: data,
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || "Registration failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("heritcraft_token");
    localStorage.removeItem("heritcraft_user");

    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("heritcraft_user", JSON.stringify(updatedUser));
  };

  /**
   * Get recent accounts from localStorage.
   */
  const getRecentAccounts = () => {
    try {
      const saved = localStorage.getItem("heritcraft_recent_accounts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  /**
   * Save account to recent accounts list (max 5).
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
      localStorage.setItem(
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
      localStorage.setItem(
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