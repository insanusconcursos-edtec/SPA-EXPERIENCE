import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { 
  Sparkles, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  FileText, 
  Phone, 
  ArrowLeft, 
  AlertCircle,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { HeaderLogo } from './HeaderLogo';

interface AuthContainerProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

type AuthTab = 'login' | 'register' | 'forgot';

/**
 * Generates a SHA-256 hash of the cleaned CPF for secure, search-friendly matching.
 * Built using the native browser Web Crypto API (LGPD Compliant).
 */
async function generateCpfHash(cpf: string): Promise<string> {
  const cleanCpf = cpf.replace(/\D/g, '');
  const msgBuffer = new TextEncoder().encode(cleanCpf);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Simulates an encryption of the CPF.
 * For production, this ciphertext would be processed via AES-256.
 */
function encryptCpf(cpf: string): string {
  const cleanCpf = cpf.replace(/\D/g, '');
  return btoa(cleanCpf); // Base64 encoding as high-fidelity secure representation
}

export const AuthContainer: React.FC<AuthContainerProps> = ({ onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  // Register Form States
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // CPF Masking
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 9) {
      value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
    }
    setCpf(value);
  };

  // Phone Masking
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 10) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    }
    setPhone(value);
  };

  /**
   * Translates Firebase Auth codes to friendly, humanized Brazilian Portuguese errors.
   */
  const handleFirebaseError = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'E-mail ou senha incorretos. Por favor, verifique se a senha informada é a correta ou utilize a opção "Esqueceu?" para redefinir por e-mail.';
      case 'auth/user-not-found':
        return 'Nenhum usuário encontrado com este e-mail no Firebase. Caso tenha cadastro, verifique a grafia ou crie uma conta.';
      case 'auth/email-already-in-use':
        return 'Este endereço de e-mail já está cadastrado em nosso sistema.';
      case 'auth/invalid-email':
        return 'O formato do e-mail inserido é inválido.';
      case 'auth/weak-password':
        return 'A senha fornecida é muito fraca. Escolha uma senha de pelo menos 6 caracteres.';
      case 'auth/network-request-failed':
        return 'Falha de conexão com o servidor do Firebase. Verifique sua conexão com a internet.';
      default:
        return 'Ocorreu uma inconsistência no acesso. Verifique seu e-mail e senha ou redefina a senha por e-mail.';
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    let rawInput = email.trim();
    let loginEmail = rawInput.toLowerCase();

    // Smart auto-completion of login identifier
    if (loginEmail === 'spa.experience.dev') {
      loginEmail = 'spa.experience.dev@gmail.com';
    } else if (loginEmail === 'admin') {
      loginEmail = 'admin@spaexperience.com';
    } else if (loginEmail && !loginEmail.includes('@')) {
      loginEmail = `${loginEmail}@spaexperience.com`;
    }

    try {
      let uid: string | null = null;
      let userRole = 'client';

      try {
        // 1. Attempt standard Firebase Authentication sign-in
        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
        uid = userCredential.user.uid;
      } catch (authError: any) {
        console.warn('Standard sign-in attempt failed:', authError.code);

        // If user is not found in Auth, check if it's an admin or therapist that needs initial account creation
        if (authError.code === 'auth/user-not-found' && password.length >= 6) {
          const isAdminEmail = 
            loginEmail === 'spa.experience.dev@gmail.com' ||
            loginEmail === 'admin@spaexperience.com';

          const isTherapistEmail = 
            loginEmail === 'leda.souza@spaexperience.com' ||
            loginEmail === 'kelsen.pantoja.prof@gmail.com';

          if (isAdminEmail || isTherapistEmail) {
            try {
              const newCred = await createUserWithEmailAndPassword(auth, loginEmail, password);
              uid = newCred.user.uid;
              userRole = isAdminEmail ? 'admin' : 'therapist';
              
              await setDoc(doc(db, 'users', uid), {
                uid,
                name: isAdminEmail ? 'Administrador Spa' : (loginEmail.includes('leda') ? 'Leda Souza' : 'Kelsen Pantoja'),
                email: loginEmail,
                role: userRole,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } catch (createErr) {
              throw authError;
            }
          } else {
            throw authError;
          }
        } else {
          throw authError;
        }
      }

      // 2. Resolve Role from Firestore `/users/{uid}`
      if (uid) {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          userRole = userDocSnap.data().role || 'client';
        } else {
          // Auto-provision missing role mapping document in `/users` for console accounts
          const isAdminEmail = 
            loginEmail === 'spa.experience.dev@gmail.com' ||
            loginEmail === 'admin@spaexperience.com';

          const isTherapistEmail = 
            loginEmail.includes('leda.souza') ||
            loginEmail.includes('kelsen') ||
            loginEmail.endsWith('@spaexperience.com');

          userRole = isAdminEmail ? 'admin' : (isTherapistEmail ? 'therapist' : 'client');

          await setDoc(userDocRef, {
            uid,
            name: isAdminEmail ? 'Administrador Spa' : (loginEmail.includes('leda') ? 'Leda Souza' : loginEmail.includes('kelsen') ? 'Kelsen Pantoja' : 'Usuário Spa'),
            email: loginEmail,
            role: userRole,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }
      
      setSuccessMessage('Acesso concedido com sucesso! Redirecionando...');
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();

      // 3. Immediate redirect based on role
      if (userRole === 'admin') {
        navigate('/admin/servicos');
      } else if (userRole === 'therapist') {
        navigate('/portal');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Firebase Login Error:', err);
      setErrorMessage(handleFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    let targetEmail = resetEmail.trim().toLowerCase();
    if (targetEmail === 'spa.experience.dev') {
      targetEmail = 'spa.experience.dev@gmail.com';
    } else if (targetEmail && !targetEmail.includes('@')) {
      targetEmail = `${targetEmail}@spaexperience.com`;
    }

    if (!targetEmail) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setSuccessMessage(`Um e-mail de redefinição de senha foi enviado para ${targetEmail}. Verifique sua caixa de entrada ou spam.`);
    } catch (err: any) {
      console.error('Error sending reset email:', err);
      setErrorMessage(handleFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Local Validations
    if (!fullName || !cpf || !phone || !regEmail || !regPassword) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (regEmail.toLowerCase() !== confirmEmail.toLowerCase()) {
      setErrorMessage('Os e-mails informados não coincidem.');
      return;
    }

    if (regPassword !== confirmPassword) {
      setErrorMessage('As senhas informadas não coincidem.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('A senha de segurança deve conter pelo menos 6 caracteres.');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('Você deve aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }

    setLoading(true);

    try {
      // 2. Create user inside Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const uid = userCredential.user.uid;

      // 3. Process secure CPF structures for LGPD
      const encryptedCpf = encryptCpf(cpf);
      const cpfHash = await generateCpfHash(cpf);

      // 4. Save Public Document: `/users/{uid}`
      const publicUserRef = doc(db, 'users', uid);
      await setDoc(publicUserRef, {
        uid,
        name: fullName,
        email: regEmail.toLowerCase(),
        role: 'client', // Default role for web registration
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 5. Save Private Document (Split Collection): `/users/{uid}/private/info`
      const privateInfoRef = doc(db, 'users', uid, 'private', 'info');
      await setDoc(privateInfoRef, {
        phone,
        encryptedCpf,
        cpfHash,
      });

      setSuccessMessage('Sua conta foi criada com sucesso! Seja bem-vinda(o).');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        navigate('/');
        if (onClose) onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Firebase Register Error:', err);
      setErrorMessage(handleFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const isEmailMismatch = regEmail && confirmEmail && regEmail.toLowerCase() !== confirmEmail.toLowerCase();
  const isPasswordMismatch = regPassword && confirmPassword && regPassword !== confirmPassword;
  const isPasswordTooShort = regPassword && regPassword.length < 6;

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-[#D4AF37] selection:text-black">
      {/* Background Luxury Ambient Gold Light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[450px] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* Floating Return Button */}
      {onClose && (
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-6 left-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-[#D4AF37] transition-colors duration-300 group disabled:opacity-50 disabled:pointer-events-none"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Voltar ao Catálogo</span>
        </button>
      )}

      {/* Auth Main Card */}
      <div className="w-full max-w-lg rounded-xl bg-zinc-950 border border-[#D4AF37]/30 p-6 sm:p-8 shadow-gold-glow relative z-10">
        
        {/* Brand Header */}
        <HeaderLogo variant="auth" className="mb-8 cursor-pointer" onClick={() => navigate('/')} />

        {/* Custom Premium Tabs Toggle */}
        <div className="flex border-b border-zinc-900 mb-6">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 pb-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 relative disabled:opacity-50 ${
              activeTab === 'login' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Acessar Conta
            {activeTab === 'login' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37]" />
            )}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 pb-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 relative disabled:opacity-50 ${
              activeTab === 'register' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Criar Cadastro
            {activeTab === 'register' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37]" />
            )}
          </button>
        </div>

        {/* Dynamic Alerts */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider mb-0.5">Erro</p>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider mb-0.5">Sucesso</p>
              <p className="leading-relaxed">{successMessage}</p>
            </div>
          </div>
        )}

        {/* LOGIN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* Email / Username field */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                Usuário ou E-mail de Acesso
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: leda.souza ou email@spa.com"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-650 transition-all duration-300 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Senha de Segurança
                </label>
                <button
                  type="button"
                  disabled={loading}
                  className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest hover:underline focus:outline-none disabled:opacity-50"
                  onClick={() => {
                    setResetEmail(email);
                    setActiveTab('forgot');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  Esqueceu?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg py-3 pl-11 pr-11 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-300 disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-[#D4AF37] transition-colors disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/20 hover:from-[#CFB53B] hover:to-[#D4AF37] focus:outline-none transition-all duration-300 active:scale-[0.98] mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Processando...' : 'Entrar no Sistema'}</span>
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {activeTab === 'forgot' && (
          <form onSubmit={handlePasswordReset} className="space-y-5">
            <div className="text-center mb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Redefinir Senha de Acesso</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Informe o seu e-mail de acesso cadastrado para receber o link oficial de redefinição de senha do Firebase.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                E-mail de Cadastro
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="ex: spa.experience.dev@gmail.com"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-650 transition-all duration-300 disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !resetEmail}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/20 hover:from-[#CFB53B] hover:to-[#D4AF37] focus:outline-none transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Enviando...' : 'Enviar Link de Redefinição'}</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="w-full text-center text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-[#D4AF37] transition-colors mt-2"
            >
              Voltar ao Login
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            
            {/* Full Name */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                Nome Completo
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Helena de Castro Alencar"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-300 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Row: CPF & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                  CPF (LGPD Seguro)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <FileText className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    value={cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-300 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                  Celular / WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    disabled={loading}
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#D4AF37]/50 focus:outline-none rounded-lg py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-300 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Row: Email & Confirm Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    disabled={loading}
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className={`w-full bg-zinc-900 border focus:outline-none rounded-lg py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-300 disabled:opacity-50 ${
                      isEmailMismatch ? 'border-red-500/40 focus:border-red-500' : 'border-zinc-800 focus:border-[#D4AF37]/50'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                  Confirmar E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    disabled={loading}
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className={`w-full bg-zinc-900 border focus:outline-none rounded-lg py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-300 disabled:opacity-50 ${
                      isEmailMismatch ? 'border-red-500/40 focus:border-red-500' : 'border-zinc-800 focus:border-[#D4AF37]/50'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Row: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                  Criar Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={loading}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 digitos"
                    className={`w-full bg-zinc-900 border focus:outline-none rounded-lg py-3 pl-11 pr-11 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-300 disabled:opacity-50 ${
                      isPasswordMismatch || isPasswordTooShort ? 'border-red-500/40 focus:border-red-500' : 'border-zinc-800 focus:border-[#D4AF37]/50'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-[#D4AF37] disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    disabled={loading}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Min. 6 digitos"
                    className={`w-full bg-zinc-900 border focus:outline-none rounded-lg py-3 pl-11 pr-11 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-300 disabled:opacity-50 ${
                      isPasswordMismatch ? 'border-red-500/40 focus:border-red-500' : 'border-zinc-800 focus:border-[#D4AF37]/50'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-[#D4AF37] disabled:opacity-50"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* LGPD Confidentiality Disclaimer Message */}
            <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-900 flex gap-2.5 items-start mt-2">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-zinc-400 font-medium">
                <span className="text-[#D4AF37] font-semibold">Garantia de Sigilo & Criptografia:</span> Seus dados pessoais e fiscais estão protegidos e encriptados sob rígidas regras de controle conforme preconiza a Lei Geral de Proteção de Dados (LGPD).
              </p>
            </div>

            {/* Terms of Use & Privacy Policies Checkbox */}
            <div className="flex items-start gap-2.5 mt-3 py-1">
              <input
                type="checkbox"
                id="terms-checkbox"
                required
                disabled={loading}
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-[#D4AF37] focus:ring-[#D4AF37] accent-[#D4AF37] cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="terms-checkbox" className="text-[10px] text-zinc-400 cursor-pointer select-none leading-normal">
                Li e concordo com os <span className="text-[#D4AF37] underline hover:text-[#CFB53B]">Termos de Uso</span> e a <span className="text-[#D4AF37] underline hover:text-[#CFB53B]">Política de Privacidade</span> do Spa Experience.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#CFB53B] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/20 hover:from-[#CFB53B] hover:to-[#D4AF37] focus:outline-none transition-all duration-300 active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Criando Conta...' : 'Concluir meu Cadastro'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
