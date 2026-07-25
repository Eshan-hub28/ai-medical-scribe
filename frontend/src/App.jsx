import { useState, useRef, useEffect } from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import './index.css';

// SVG Icons
const MicIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/24/svg">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/24/svg">
    <path d="M6 6h12v12H6z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/24/svg">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/24/svg">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const UserAvatar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const DoctorAvatar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 11h-2v2h-2v-2H9v-2h2V9h2v2h2v2z"/>
  </svg>
);

const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('scribe_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState(() => {
    const saved = localStorage.getItem('scribe_transcript');
    return saved ? JSON.parse(saved) : [];
  });
  const [soapNote, setSoapNote] = useState(() => {
    const saved = localStorage.getItem('scribe_soap_note');
    return saved ? JSON.parse(saved) : {
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    };
  });
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    message: '',
    onConfirm: null,
    onCancel: null
  });

  const triggerConfirm = ({ message, onConfirm, onCancel }) => {
    setConfirmModal({
      show: true,
      message,
      onConfirm,
      onCancel
    });
  };
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const transcriptEndRef = useRef(null);
  const isConfirmedRef = useRef(false);

  // Sync with browser history for back button support
  useEffect(() => {
    if (transcript.length > 0) {
      if (window.history.state?.view !== 'results') {
        window.history.pushState({ view: 'results' }, '');
      }
    } else {
      if (window.history.state?.view === 'results') {
        window.history.replaceState(null, '');
      }
    }
  }, [transcript]);

  useEffect(() => {
    const handlePopState = (event) => {
      if ((!event.state || event.state.view !== 'results') && transcript.length > 0) {
        if (isConfirmedRef.current) {
          isConfirmedRef.current = false;
          clearConsultation();
        } else {
          // Immediately restore state so UI doesn't jump prematurely
          window.history.pushState({ view: 'results' }, '');
          triggerConfirm({
            message: "Are you sure you want to start a new consultation? This will clear the current transcript and SOAP notes.",
            onConfirm: () => {
              isConfirmedRef.current = true;
              window.history.go(-2);
            },
            onCancel: () => {
              // History state is already pushed, no further action needed
            }
          });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [transcript]);

  const handleLoginSuccess = (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    setUser(decoded);
    localStorage.setItem('scribe_user', JSON.stringify(decoded));
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('scribe_user');
    localStorage.removeItem('scribe_transcript');
    localStorage.removeItem('scribe_soap_note');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordedAudio(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access the microphone. Please check permissions.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (isRecording || isPaused)) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const discardAudio = () => {
    setRecordedAudio(null);
    setIsRecording(false);
    setIsPaused(false);
    audioChunksRef.current = [];
  };

  const clearConsultation = () => {
    setTranscript([]);
    setSoapNote({
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    });
    localStorage.removeItem('scribe_transcript');
    localStorage.removeItem('scribe_soap_note');
    discardAudio();
  };

  const handleNewConsultation = () => {
    triggerConfirm({
      message: "Are you sure you want to start a new consultation? This will clear the current transcript and SOAP notes.",
      onConfirm: () => {
        if (window.history.state?.view === 'results') {
          isConfirmedRef.current = true;
          window.history.back();
        } else {
          clearConsultation();
        }
      }
    });
  };

  const processAudio = async () => {
    if (!recordedAudio) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append('audio', recordedAudio, 'consultation.wav');

    try {
      const response = await fetch(`${API_BASE_URL}/process_audio`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const newTranscript = data.transcript || [];
      const newSoapNote = {
        subjective: data.soap_note?.subjective || '',
        objective: data.soap_note?.objective || '',
        assessment: data.soap_note?.assessment || '',
        plan: data.soap_note?.plan || ''
      };
      
      setTranscript(newTranscript);
      setSoapNote(newSoapNote);
      
      localStorage.setItem('scribe_transcript', JSON.stringify(newTranscript));
      localStorage.setItem('scribe_soap_note', JSON.stringify(newSoapNote));
      
      setTimeout(() => {
        if (transcriptEndRef.current) {
          transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
    } catch (err) {
      console.error("Error processing audio:", err);
      alert("An error occurred while processing the audio.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSoapChange = (field, value) => {
    setSoapNote(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      localStorage.setItem('scribe_soap_note', JSON.stringify(updated));
      return updated;
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const exportPDF = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/export_pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ soap_note: soapNote }),
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SOAP_Note.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Could not export PDF.");
    }
  };

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-icon-wrapper">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <h2>AI Medical Scribe</h2>
          <p>Sign in securely with Google to access your clinical dashboard.</p>
          <div style={{ marginTop: '1rem' }}>
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={() => {
                console.log('Login Failed');
              }}
              useOneTap
              shape="pill"
              theme="filled_blue"
              size="large"
              text="continue_with"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
          <h1>AI Medical Scribe</h1>
        </div>
        
        <div className="header-actions">
          <div className="user-profile">
            <img src={user.picture} alt="Profile" className="user-avatar" referrerPolicy="no-referrer" />
            <span className="user-name">{user.name}</span>
          </div>
          
          {transcript.length > 0 && (
            <button className="btn btn-new-consultation" onClick={handleNewConsultation}>
              <PlayIcon /> New Consultation
            </button>
          )}
          
          {transcript.length > 0 && (
            <button className="btn btn-primary" onClick={exportPDF}>
              <DownloadIcon /> Export PDF
            </button>
          )}
          
          <button className="btn btn-danger" onClick={handleLogout}>
            <LogoutIcon /> Sign Out
          </button>
        </div>
      </header>

      {transcript.length === 0 && !isLoading ? (
        <div className="panel setup-container" style={{ backgroundImage: 'radial-gradient(circle at top right, #eff6ff, transparent 40%)' }}>
          <h2>Ready for Consultation</h2>
          <p>Click the microphone below to start recording your session. You can pause at any time.</p>
          
          <div style={{ display: 'flex', gap: '2rem', margin: '1rem 0 3rem 0', color: '#64748b', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Secure & Private
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Real-time Transcription
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Automatic SOAP Notes
            </div>
          </div>

          <div className="record-actions-container" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {(!isRecording && !isPaused && !recordedAudio) && (
              <div className="record-btn-wrapper">
                <button className="record-btn" onClick={startRecording} title="Start Recording">
                  <MicIcon />
                </button>
              </div>
            )}

            {(isRecording || isPaused) && (
              <>
                <button className="action-btn cancel-btn" onClick={discardAudio} title="Cancel">
                  <XIcon />
                </button>
                <div className="record-btn-wrapper">
                  {!isPaused && <div className="pulse-ring"></div>}
                  <button 
                    className={`record-btn ${!isPaused ? 'recording' : 'paused'}`}
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    title={isPaused ? "Resume" : "Pause"}
                  >
                    {isPaused ? <PlayIcon /> : <PauseIcon />}
                  </button>
                </div>
                <button className="action-btn stop-btn" onClick={stopRecording} title="Finish">
                  <StopIcon />
                </button>
              </>
            )}

            {recordedAudio && (
              <>
                <button className="action-btn cancel-btn" onClick={discardAudio} title="Discard Audio">
                  <XIcon /> Discard
                </button>
                <button className="action-btn process-btn" onClick={processAudio} title="Process Audio">
                  <CheckIcon /> Process
                </button>
              </>
            )}
          </div>
          
          {isRecording && <p style={{ color: 'var(--danger)', fontWeight: 600, marginTop: '1.5rem' }}>Listening securely...</p>}
          {isPaused && <p style={{ color: '#f59e0b', fontWeight: 600, marginTop: '1.5rem' }}>Recording paused.</p>}
          {recordedAudio && <p style={{ color: 'var(--success)', fontWeight: 600, marginTop: '1.5rem' }}>Audio ready for processing.</p>}
        </div>
      ) : (
        <main className="main-content">
          {/* Transcript Panel */}
          <div className="panel-col panel">
            <div className="panel-header">
              <span>Live Transcript</span>
            </div>
            
            {isLoading && (
              <div className="loading-overlay">
                <div className="loader"></div>
                <div className="loading-text">Analyzing & Translating...</div>
              </div>
            )}
            
            <div className="panel-content">
              {transcript.map((line, idx) => {
                const isDoctor = line.speaker.toLowerCase().includes('doctor');
                return (
                  <div key={idx} className={`transcript-line ${isDoctor ? 'is-doctor' : 'is-patient'}`}>
                    <div className="speaker-info">
                      {isDoctor ? <DoctorAvatar /> : <UserAvatar />}
                      {line.speaker}
                    </div>
                    <div className="bubble">{line.text}</div>
                  </div>
                );
              })}
              <div ref={transcriptEndRef} />
            </div>
          </div>

          {/* SOAP Note Panel */}
          <div className="panel-col panel">
            <div className="panel-header">
              <span>AI SOAP Note</span>
            </div>
            <div className="panel-content soap-grid">
              {['subjective', 'objective', 'assessment', 'plan'].map((field) => (
                <div key={field} className="form-group">
                  <label>
                    {field}
                    <button 
                      className="copy-btn-small" 
                      onClick={() => copyToClipboard(soapNote[field])}
                      title={`Copy ${field}`}
                    >
                      <CopyIcon /> Copy
                    </button>
                  </label>
                  <textarea 
                    value={soapNote[field]}
                    onChange={(e) => handleSoapChange(field, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {confirmModal.show && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Confirmation Required</h3>
            <p>{confirmModal.message}</p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setConfirmModal(prev => ({ ...prev, show: false }));
                  if (confirmModal.onCancel) confirmModal.onCancel();
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  setConfirmModal(prev => ({ ...prev, show: false }));
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
