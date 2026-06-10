import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiEye, FiEyeOff, FiLoader, FiClock, FiTrash2, FiCheckCircle, FiArrowLeft } from "react-icons/fi";
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
    phone: "",
    address: "",
  });

  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [signupStep, setSignupStep] = useState(1);
  const [otpPhone, setOtpPhone] = useState("");
  const [signupOtp, setSignupOtp] = useState("");

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
        if (signupStep === 1) {
          // Validate required fields
          if (!form.name || !form.email || !form.password) {
            throw new Error("Please fill all required fields");
          }
          if (form.password.length < 6) {
            throw new Error("Password must be at least 6 characters");
          }
          if (form.role === "seller") {
            if (!form.shopName || !form.shopDescription || !form.address) {
              throw new Error("Please fill all seller profile fields");
            }
          }
          // Move to step 2 (Enter Mobile Number screen)
          setSignupStep(2);
          setLoading(false);
          return;
        }
      } else {
        result = await login(form.email, form.password);
        if (result?.phoneVerificationRequired) {
          setOtpPhone(result.phone);
          setForm(prev => ({ ...prev, role: result.role }));
          setSignupStep(3); // Legacy login goes directly to verify OTP (Step 3)
          toast.success("Phone verification required. An OTP has been sent.");
          setLoading(false);
          return;
        }
      }

      const loggedUser = result?.user || result;

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
      const errMsg = err.response?.data?.message || err.message || "Something went wrong";
      if (errMsg.toLowerCase().includes("disabled") || errMsg.toLowerCase().includes("contact administrator")) {
        setError("User account is disabled. Contact administrator.");
      } else {
        setError(errMsg);
      }
    }

    setLoading(false);
  };

  const handleSendMobileOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!form.phone || !/^\d{10}$/.test(form.phone)) {
        throw new Error("Mobile number must be exactly 10 digits");
      }
      await authAPI.sendPhoneOtp(form.phone);
      setOtpPhone(form.phone);
      setSignupStep(3); // Move to Verify OTP screen (Step 3)
      toast.success("OTP sent successfully.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignupOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!signupOtp) {
        throw new Error("Please enter the OTP");
      }
      await authAPI.verifyPhoneOtp(otpPhone, signupOtp);

      if (isSignup) {
        await register(form);
        if (form.role === "seller") {
          setPendingMessage(
            "Phone verified. Seller account is waiting for admin approval."
          );
        } else {
          toast.success("Signup successful. Please login.");
          setCurrentMode("login");
          setSignupStep(1);
          setSignupOtp("");
          setForm({
            name: "",
            email: "",
            password: "",
            role: "buyer",
            shopName: "",
            shopDescription: "",
            phone: "",
            address: "",
          });
        }
      } else {
        toast.success("Mobile number verified successfully. Please log in.");
        setCurrentMode("login");
        setSignupStep(1);
        setSignupOtp("");
        setForm(prev => ({ ...prev, password: "" }));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignupOtp = async () => {
    setError("");
    setLoading(true);
    try {
      await authAPI.sendPhoneOtp(otpPhone);
      toast.success("OTP resent successfully.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
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


  if (isSignup && signupStep === 2) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="auth-box max-h-[90vh] flex flex-col overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="auth-close">
            <FiX size={26} />
          </button>

          <h2 className="auth-title flex-shrink-0">Verify Mobile Number</h2>
          <p className="auth-subtitle flex-shrink-0 mb-4">
            Enter your mobile number to receive OTP
          </p>

          <form onSubmit={handleSendMobileOtp} className="auth-form flex flex-col flex-1 min-h-0">
            {error && (
              <div className="error-box mb-4 text-red-400 text-center font-semibold flex-shrink-0">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
              <div className="field">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-gold"
                  placeholder="10-digit mobile number"
                  required
                  maxLength={10}
                  pattern="\d{10}"
                />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-800 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span
                  onClick={() => {
                    setSignupStep(1);
                    setError("");
                  }}
                  className="text-xs text-gray-400 cursor-pointer hover:underline font-bold"
                >
                  Back to signup details
                </span>
              </div>

              <button type="submit" disabled={loading} className="btn-gold w-full text-xl py-4">
                {loading ? <FiLoader className="animate-spin mx-auto" /> : "Send OTP"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (signupStep === 3) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="auth-box max-h-[90vh] flex flex-col overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="auth-close">
            <FiX size={26} />
          </button>

          <h2 className="auth-title flex-shrink-0">Enter OTP</h2>
          <p className="auth-subtitle flex-shrink-0 mb-4">
            OTP sent to <span className="text-[var(--gold)]">{otpPhone}</span>
          </p>

          <form onSubmit={handleVerifySignupOtp} className="auth-form flex flex-col flex-1 min-h-0">
            {error && (
              <div className="error-box mb-4 text-red-400 text-center font-semibold flex-shrink-0">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
              <div className="field">
                <label>Enter 6-digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={signupOtp}
                  onChange={(e) => setSignupOtp(e.target.value)}
                  className="input-gold text-center tracking-widest font-bold text-xl"
                  placeholder="000000"
                  required
                />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-800 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span onClick={handleResendSignupOtp} className="text-xs text-[var(--gold)] cursor-pointer hover:underline font-bold">
                  Resend OTP?
                </span>
                <span
                  onClick={() => {
                    if (isSignup) {
                      setSignupStep(2);
                    } else {
                      setSignupStep(1);
                      setCurrentMode("login");
                    }
                    setError("");
                  }}
                  className="text-xs text-gray-400 cursor-pointer hover:underline font-bold"
                >
                  Back
                </span>
              </div>

              <button type="submit" disabled={loading} className="btn-gold w-full text-xl py-4">
                {loading ? <FiLoader className="animate-spin mx-auto" /> : "Verify OTP"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-box max-h-[90vh] flex flex-col overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="auth-close">
          <FiX size={26} />
        </button>

        <h2 className="auth-title flex-shrink-0">
          {isSignup ? "Create Account" : "Welcome Back"}
        </h2>

        <p className="auth-subtitle flex-shrink-0 mb-4">
          {isSignup
            ? "Create your HeritCraft account"
            : "Login with your registered email"}
        </p>

        {/* Recent Accounts — Login mode only */}
        {!isSignup && recentAccounts.length > 0 && (
          <div className="mb-4 flex-shrink-0">
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
          <form onSubmit={handleForgotSubmit} className="auth-form flex flex-col flex-1 min-h-0">
            {error && (
              <div className="error-box mb-4 text-red-400 text-center font-semibold flex-shrink-0">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
              {forgotStep === 1 && (
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
              )}

              {forgotStep === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode("signup");
                      setForgotStep(1);
                      setError("");
                    }}
                    style={{
                      background: "rgba(212,175,55,0.08)",
                      border: "1px solid rgba(212,175,55,0.25)",
                      color: "var(--gold)",
                      borderRadius: 999,
                      padding: "8px 14px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontWeight: 800,
                      cursor: "pointer",
                      marginBottom: 16,
                    }}
                  >
                    <FiArrowLeft size={15} />
                    Back
                  </button>
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
                  <div className="flex justify-between items-center mt-2">
                    <span onClick={handleResendOtp} className="text-xs text-[var(--gold)] cursor-pointer hover:underline">
                      Resend OTP?
                    </span>
                    <span onClick={() => setForgotStep(1)} className="text-xs text-gray-400 cursor-pointer hover:underline">
                      Change Email
                    </span>
                  </div>
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
                </>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-gray-800 flex-shrink-0">
              {forgotStep === 1 && (
                <button type="submit" disabled={loading} className="btn-gold w-full text-xl py-4">
                  {loading ? <FiLoader className="animate-spin mx-auto" /> : "Send OTP"}
                </button>
              )}
              {forgotStep === 2 && (
                <button type="submit" disabled={loading} className="btn-gold w-full text-xl py-4">
                  {loading ? <FiLoader className="animate-spin mx-auto" /> : "Verify OTP"}
                </button>
              )}
              {forgotStep === 3 && (
                <button type="submit" disabled={loading} className="btn-gold w-full text-xl py-4">
                  {loading ? <FiLoader className="animate-spin mx-auto" /> : "Reset Password"}
                </button>
              )}
              <div className="auth-switch-text">
                Back to{" "}
                <span onClick={() => { setCurrentMode("login"); setError(""); setForgotStep(1); }}>
                  Login
                </span>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form flex flex-col flex-1 min-h-0">
            {error && (
              <div className="error-box mb-4 text-red-400 text-center font-semibold flex-shrink-0">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
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
                      className="input-gold bg-[#111] text-white"
                      required
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
                      required
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
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Seller Address</label>
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      className="input-gold"
                      rows="2"
                      placeholder="Enter shop address"
                      required
                    />
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-gray-800 flex-shrink-0">
              <button type="submit" disabled={loading} className="btn-gold w-full text-xl py-4">
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
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;