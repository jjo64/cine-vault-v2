import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import './AuthModal.css';
import { buildGoogleOAuthUrl, notifyAuthStateChanged, setStoredAccessToken, verifyTwoFactorLogin } from '../services/authServices'
import { notify } from '../lib/notify'
import { conectarSocket } from '../context/SocketContext'

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'register';
}

type AuthStep = 'login' | 'register' | 'two-factor'

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
    const [step, setStep] = useState<AuthStep>(initialMode);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [twoFactorCode, setTwoFactorCode] = useState('')
    const [tempToken, setTempToken] = useState('')
    const [rememberDevice, setRememberDevice] = useState(true)
    const [loading, setLoading] = useState(false);
    const [hasSubmitError, setHasSubmitError] = useState(false);

    useEffect(() => {
        setStep(initialMode)
        setHasSubmitError(false)
        setTwoFactorCode('')
        setTempToken('')
        setRememberDevice(true)
    }, [initialMode, isOpen])

    useEffect(() => {
        if (!isOpen) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isOpen, onClose])

    useEffect(() => {
        if (!isOpen) return
        const timer = setTimeout(() => {
            const firstInput = document.getElementById('auth-username')
                || document.getElementById('auth-email')
                || document.getElementById('auth-2fa-code')
            if (firstInput instanceof HTMLElement) firstInput.focus()
        }, 50)
        return () => clearTimeout(timer)
    }, [isOpen, step])

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (hasSubmitError) setHasSubmitError(false)
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const completeAuth = (accessToken: string) => {
        setStoredAccessToken(accessToken)
        conectarSocket(accessToken)
        notifyAuthStateChanged(true)
        notify.loginOk()
        onClose()
    }

    const handlePrimarySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setHasSubmitError(false);

        const endpoint = step === 'login' ? '/api/auth/login' : '/api/auth/register';
        const url = `${import.meta.env.VITE_API_URL}${endpoint}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Error en autenticación');

            if (step === 'login') {
                if (data.two_factor_required && data.tokenTemporal) {
                    setStep('two-factor')
                    setTempToken(data.tokenTemporal)
                    setTwoFactorCode('')
                    notify.loginError('Verificación 2FA requerida')
                    return
                }

                if (!data.accessToken) {
                    throw new Error('No se recibió token de acceso')
                }

                completeAuth(data.accessToken)
            } else {
                setStep('login');
                notify.registerOk()
            }
        } catch (err: unknown) {
            setHasSubmitError(true)
            const message = err instanceof Error ? err.message : 'Error en autenticación'
            notify.loginError(message)
        } finally {
            setLoading(false);
        }
    };

    const handleTwoFactorSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!twoFactorCode.trim() || !tempToken) {
            setHasSubmitError(true)
            notify.loginError('Ingresá el código 2FA de 6 dígitos')
            return
        }

        try {
            setLoading(true)
            setHasSubmitError(false)
            const accessToken = await verifyTwoFactorLogin(twoFactorCode.trim(), tempToken, rememberDevice)
            completeAuth(accessToken)
        } catch (err: unknown) {
            setHasSubmitError(true)
            const message = err instanceof Error ? err.message : 'No se pudo verificar 2FA'
            notify.loginError(message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = () => {
        window.location.href = buildGoogleOAuthUrl()
    }

    const isTwoFactorStep = step === 'two-factor'
    const title = isTwoFactorStep ? 'Verificación 2FA' : step === 'login' ? 'Iniciar sesión' : 'Crear cuenta'
    const subtitle = isTwoFactorStep
        ? 'Ingresa el código de tu app autenticadora'
        : step === 'login'
            ? 'TU VAULT TE ESPERA'
            : 'EL CINE EMPIEZA AQUÍ'

    return (
        <div
            className="auth-modal-overlay"
            onClick={onClose}
            role="presentation"
            aria-hidden={false}
        >
            <motion.div
                className="auth-modal-content"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                aria-describedby="auth-modal-desc"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <button className="auth-modal-close" onClick={onClose} aria-label="Cerrar">&times;</button>

                <h2 className="auth-modal-title" id="auth-modal-title">{title}</h2>
                <p className="auth-modal-subtitle">{subtitle}</p>
                <span
                    id="auth-modal-desc"
                    style={{
                        position: 'absolute', width: 1, height: 1, padding: 0,
                        margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)',
                        whiteSpace: 'nowrap', border: 0,
                    }}
                >
                    {step === 'login' ? 'Formulario para iniciar sesión en CineVault'
                        : step === 'register' ? 'Formulario para crear una cuenta en CineVault'
                            : 'Formulario de verificación en dos pasos'}
                </span>

                {!isTwoFactorStep ? (
                    <form onSubmit={handlePrimarySubmit} className="auth-form">
                        {step === 'register' && (
                            <>
                                <label htmlFor="auth-email" style={{
                                    position: 'absolute', width: 1, height: 1,
                                    padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)',
                                    whiteSpace: 'nowrap', border: 0
                                }}>
                                    Email
                                </label>
                                <input
                                    id="auth-email"
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                    className={`auth-input ${hasSubmitError ? 'auth-input-error' : ''}`}
                                />
                            </>
                        )}
                        <>
                            <label htmlFor="auth-username" style={{
                                position: 'absolute', width: 1, height: 1,
                                padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)',
                                whiteSpace: 'nowrap', border: 0
                             }}>
                                Nombre de usuario
                            </label>
                            <input
                                id="auth-username"
                                type="text"
                                name="username"
                                placeholder="Nombre de usuario"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                autoComplete={step === 'login' ? 'username' : 'username'}
                                className={`auth-input ${hasSubmitError ? 'auth-input-error' : ''}`}
                            />
                        </>
                        <>
                            <label htmlFor="auth-password" style={{
                                position: 'absolute', width: 1, height: 1,
                                padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)',
                                whiteSpace: 'nowrap', border: 0
                            }}>
                                Contraseña
                            </label>
                            <input
                                id="auth-password"
                                type="password"
                                name="password"
                                placeholder="Contraseña"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                autoComplete={step === 'login' ? 'current-password' : 'new-password'}
                                className={`auth-input ${hasSubmitError ? 'auth-input-error' : ''}`}
                            />
                        </>

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Procesando...' : (step === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleTwoFactorSubmit} className="auth-form">
                        <input
                            id="auth-2fa-code"
                            type="text"
                            inputMode="text"
                            maxLength={12}
                            placeholder="Código 2FA o recovery code"
                            value={twoFactorCode}
                            onChange={(event) => {
                                const nextValue = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
                                setTwoFactorCode(nextValue)
                                if (hasSubmitError) setHasSubmitError(false)
                            }}
                            required
                            aria-label="Código de verificación de dos factores"
                            autoComplete="one-time-code"
                            className={`auth-input ${hasSubmitError ? 'auth-input-error' : ''}`}
                        />
                        <label style={{ color: '#9ab', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="checkbox"
                                checked={rememberDevice}
                                onChange={(event) => setRememberDevice(event.target.checked)}
                            />
                            Recordar este dispositivo por 30 días
                        </label>
                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Verificando...' : 'Verificar código'}
                        </button>
                        <button
                            type="button"
                            className="auth-google-btn"
                            onClick={() => {
                                setStep('login')
                                setTwoFactorCode('')
                                setTempToken('')
                            }}
                        >
                            Volver al login
                        </button>
                    </form>
                )}

                {!isTwoFactorStep && (
                    <>
                        <div className="auth-separator">
                            <span>o</span>
                        </div>

                        <button type="button" className="auth-google-btn" onClick={handleGoogleLogin}>
                            Continuar con Google
                        </button>

                        <div className="auth-toggle-text">
                            {step === 'login' ? (
                                <>¿No tienes cuenta? <span onClick={() => setStep('register')}>Regístrate</span></>
                            ) : (
                                <>¿Ya tienes cuenta? <span onClick={() => setStep('login')}>Inicia Sesión</span></>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default AuthModal;
