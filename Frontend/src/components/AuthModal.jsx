import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiEye, FiEyeOff, FiLoader, FiClock, FiTrash2, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authAPI } from "../services/api";
import { initEncryption, encryptPassword } from "../utils/encryption";

const AuthModal = ({ mode = "login", onClose }) => {
  const [currentMode, setCurrentMode] = useState(mode);
  const isSignup = currentMode === "signup";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "buyer",
    shopName: "",
    shopDescription: "",
  });

  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { login, register, getRecentAccounts, removeRecentAccount } = useAuth();
  const [recentList, setRecentList] = useState(() => getRecentAccounts());
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (forgotStep === 1) {
        if (!forgotEmail) {
          throw new Error("Please enter your email");
        }
        await authAPI.forgotPassword(forgotEmail);
        toast.success("OTP sent if the email is registered.");
        setForgotStep(2);
      } else if (forgotStep === 2) {
        if (!forgotOtp) {
          throw new Error("Please enter the OTP");
        }
        await authAPI.verifyOtp(forgotEmail, forgotOtp);
        toast.success("OTP verified. Enter your new password.");
        setForgotStep(3);
      } else if (forgotStep === 3) {
        if (!newPassword || !confirmPassword) {
          throw new Error("Please fill all password fields");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        
        await initEncryption(authAPI.getPublicKey);
        const encNewPassword = encryptPassword(newPassword);
        
        await authAPI.resetPassword(forgotEmail, forgotOtp, encNewPassword);
        toast.success("Password reset successfully. Please login.");
        setCurrentMode("login");
        setForgotStep(1);
        setForgotEmail("");
        setForgotOtp("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      await authAPI.forgotPassword(forgotEmail);
      toast.success("OTP resent successfully.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPendingMessage("");
    setLoading(true);

    try {
      let result;

      if (isSignup) {
        result = await register(form);

        // Seller pending approval — show message, don't close modal
        if (result.pendingApproval) {
          setPendingMessage(
            "Your seller account has been created. Please wait for admin approval before logging in."
          );
          setLoading(false);
          return;
        }
      } else {
        result = await login(form.email, form.password);
      }

      const loggedUser = result?.user;

      if (!loggedUser?.role) {
        throw new Error("No role received from server");
      }

      toast.success(`Welcome, ${loggedUser.name}!`);
      onClose();

      // Redirect based on role
      if (loggedUser.role === "admin") {
        navigate("/admin");
      } else if (loggedUser.role === "seller") {
        navigate("/seller");
      } else {
        navigate("/");
      }
    } catch (err) {
      const errMsg = err.message || "Something went wrong";
      if (errMsg.toLowerCase().includes("disabled") || errMsg.toLowerCase().includes("contact administrator")) {
        setError("User account is disabled. Contact administrator.");
      } else {
        setError(errMsg);
      }
    }

    setLoading(false);
  };

  /**
   * Pre-fill email from recent accounts.
   */
  const selectRecentAccount = (email) => {
    setForm({ ...form, email, password: "" });
  };

  const recentAccounts = !isSignup && currentMode !== "forgot" ? recentList : [];

  // Show pending approval success screen
  if (pendingMessage) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="auth-box animate-slideUp" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="auth-close">
            <FiX size={26} />
          </button>

          <div className="flex flex-col items-center gap-4 py-8">
            <FiCheckCircle size={64} className="text-[var(--gold)]" />
            <h2 className="text-xl font-bold text-[var(--gold)] text-center">
              Account Created
            </h2>
            <p className="text-gray-300 text-center text-sm leading-relaxed px-4">
              {pendingMessage}
            </p>
            <button
              onClick={() => {
                setPendingMessage("");
                setCurrentMode("login");
              }}
              className="btn-gold mt-4 px-8"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isForgot = currentMode === "forgot";


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-box animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="auth-close">
          <FiX size={26} />
        </button>

        <h2 className="auth-title">
          {isSignup ? "Create Account" : "Welcome Back"}
        </h2>

        <p className="auth-subtitle">
          {isSignup
            ? "Create your HeritCraft account"
            : "Login with your registered email"}
        </p>

        {/* Recent Accounts — Login mode only */}
        {!isSignup && recentAccounts.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
              <FiClock size={12} /> Recent Accounts
            </p>
            <div className="space-y-1">
              {recentAccounts.map((account) => (
                <div
                  key={account.email}
                  className="flex items-center justify-between bg-[#1a1a1a] rounded-lg px-3 py-2 cursor-pointer hover:bg-[#222] transition-colors"
                >
                  <div
                    className="flex-1"
                    onClick={() => selectRecentAccount(account.email)}
                  >
                    <span className="text-sm text-white">{account.name || account.email}</span>
                    <span className="text-xs text-gray-500 ml-2">({account.role})</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentAccount(account.email);
                      setRecentList((prev) => prev.filter((a) => a.email !== account.email));
                    }}
                    className="text-gray-500 hover:text-red-400 p-1"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentMode === "forgot" ? (
          <form onSubmit={handleForgotSubmit} className="auth-form">
            {error && (
              <div className="error-box mb-4 text-red-400 text-center font-semibold">
                {error}
              </div>
            )}

            {forgotStep === 1 && (
              <>
                <div className="field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="input-gold"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-gold w-full mt-2 text-xl">
                  {loading ? <FiLoader className="animate-spin mx-auto" /> : "Send OTP"}
                </button>
              </>
            )}

            {forgotStep === 2 && (
              <>
                <p className="text-sm text-gray-400 mb-4 text-center">
                  We've sent a 6-digit OTP to <span className="text-[var(--gold)]">{forgotEmail}</span>
                </p>
                <div className="field">
                  <label>Enter OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="input-gold text-center tracking-widest font-bold text-xl"
                    placeholder="000000"
                    required
                  />
                </div>
                <div className="flex justify-between items-center mt-2 mb-4">
                  <span onClick={handleResendOtp} className="text-xs text-[var(--gold)] cursor-pointer hover:underline">
                    Resend OTP?
                  </span>
                  <span onClick={() => setForgotStep(1)} className="text-xs text-gray-400 cursor-pointer hover:underline">
                    Change Email
                  </span>
                </div>
                <button type="submit" disabled={loading} className="btn-gold w-full text-xl">
                  {loading ? <FiLoader className="animate-spin mx-auto" /> : "Verify OTP"}
                </button>
              </>
            )}

            {forgotStep === 3 && (
              <>
                <div className="field relative">
                  <label>New Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-gold pr-12"
                    placeholder="Enter new password (min 6 chars)"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 bottom-4 text-gray-400"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                <div className="field">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-gold"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-gold w-full mt-2 text-xl">
                  {loading ? <FiLoader className="animate-spin mx-auto" /> : "Reset Password"}
                </button>
              </>
            )}

            <div className="auth-switch-text">
              Back to{" "}
              <span onClick={() => { setCurrentMode("login"); setError(""); setForgotStep(1); }}>
                Login
              </span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="error-box mb-4 text-red-400 text-center font-semibold">
                {error}
              </div>
            )}

            {isSignup && (
              <>
                <div className="field">
                  <label>Full Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="input-gold"
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div className="field">
                  <label>Register As</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="input-gold"
                  >
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                  </select>
                </div>
              </>
            )}

            <div className="field">
              <label>Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input-gold"
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="field relative">
              <label>Password</label>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                className="input-gold pr-12"
                placeholder="Enter your password"
                required
                minLength={6}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 bottom-4 text-gray-400"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {!isSignup && (
              <div className="flex justify-end mt-1 mb-2">
                <span
                  onClick={() => {
                    setCurrentMode("forgot");
                    setForgotStep(1);
                    setError("");
                  }}
                  className="text-xs text-[var(--gold)] cursor-pointer hover:underline"
                >
                  Forgot Password?
                </span>
              </div>
            )}

            {isSignup && form.role === "seller" && (
              <>
                <div className="field">
                  <label>Shop Name</label>
                  <input
                    name="shopName"
                    value={form.shopName}
                    onChange={handleChange}
                    className="input-gold"
                    placeholder="Enter your shop name"
                  />
                </div>

                <div className="field">
                  <label>Shop Description</label>
                  <textarea
                    name="shopDescription"
                    value={form.shopDescription}
                    onChange={handleChange}
                    className="input-gold"
                    rows="3"
                    placeholder="Describe your craft"
                  />
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full mt-2 text-xl">
              {loading ? (
                <FiLoader className="animate-spin mx-auto" />
              ) : isSignup ? (
                "Signup"
              ) : (
                "Login"
              )}
            </button>

            <div className="auth-switch-text">
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <span onClick={() => { setCurrentMode("login"); setError(""); }}>
                    Login
                  </span>
                </>
              ) : (
                <>
                  New to HeritCraft?{" "}
                  <span onClick={() => { setCurrentMode("signup"); setError(""); }}>
                    Signup
                  </span>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;