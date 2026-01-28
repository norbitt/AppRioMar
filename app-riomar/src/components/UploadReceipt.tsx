 "use client";
 
 import { useState, useRef, useEffect } from "react";
 import { 
   Camera, 
   Upload, 
   X, 
   CheckCircle, 
   Loader2, 
   Receipt, 
  QrCode, 
   Ticket, 
   ChevronRight,
   AlertCircle,
   Menu,
   Search,
  User,
   MapPin,
   History,
  Edit
 } from "lucide-react";
 import { motion, AnimatePresence } from "framer-motion";
 import { clsx } from "clsx";
 import { twMerge } from "tailwind-merge";
 import confetti from "canvas-confetti";
 
 function cn(...inputs: (string | undefined | null | false)[]) {
   return twMerge(clsx(inputs));
 }
 
type Step = "UPLOAD_RECEIPT" | "VALIDATING_RECEIPT" | "RECEIPT_SUCCESS" | "RECEIPT_ERROR" | "CHOOSE_VALIDATION" | "SCAN_TICKET" | "VALIDATING_TICKET" | "SHOW_TOTEM_CODE" | "SUCCESS_FINAL" | "MANUAL_INPUT";
 
 type HistoryItem = {
   id: string;
   date: string;
   store: string;
   value: number;
   status: "approved";
 };
 
 export default function ParkingValidator() {
   const [step, setStep] = useState<Step>("UPLOAD_RECEIPT");
   const [receiptFile, setReceiptFile] = useState<File | null>(null);
   const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
   const [ticketFile, setTicketFile] = useState<File | null>(null);
   const [ticketPreview, setTicketPreview] = useState<string | null>(null);
   
   const [receiptData, setReceiptData] = useState<{
     value: number;
     store: string;
     validationToken?: string;
   } | null>(null);
   
   const [errorMessage, setErrorMessage] = useState<string>("");
   const [totemCode, setTotemCode] = useState<string>("");
  const [totemExpiresAt, setTotemExpiresAt] = useState<number | null>(null);
  const [totemRemaining, setTotemRemaining] = useState<number>(0);
 
  const [history, setHistory] = useState<HistoryItem[]>([]);
   const [showHistory, setShowHistory] = useState(false);
   const [validationAttempts, setValidationAttempts] = useState(0);
   const [manualData, setManualData] = useState({ store: "", value: "" });
 
   const receiptInputRef = useRef<HTMLInputElement>(null);
  const ticketInputRef = useRef<HTMLInputElement>(null);
 
  useEffect(() => {}, []);
 
   const saveToHistory = (data: { store: string; value: number }) => {
     const newItem: HistoryItem = {
       id: crypto.randomUUID(),
       date: new Date().toLocaleString('pt-BR'),
       store: data.store,
       value: data.value,
       status: "approved"
     };
     const updated = [newItem, ...history].slice(0, 10);
     setHistory(updated);
     localStorage.setItem("parkingHistory", JSON.stringify(updated));
   };
 
   const triggerConfetti = () => {
     confetti({
       particleCount: 100,
       spread: 70,
       origin: { y: 0.6 },
       colors: ['#00838F', '#00ACC1', '#4DD0E1']
     });
   };
 
   const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       setReceiptFile(file);
       setReceiptPreview(URL.createObjectURL(file));
       validateReceipt(file);
     }
   };
 
   const validateReceipt = async (file: File) => {
     setStep("VALIDATING_RECEIPT");
     setErrorMessage("");
 
     const formData = new FormData();
     formData.append("file", file);
 
     try {
       const response = await fetch("/api/validate", {
         method: "POST",
         body: formData,
       });
       
       const data = await response.json();
 
       if (data.valid) {
         setReceiptData(data.data);
         saveToHistory(data.data);
         triggerConfetti();
         setValidationAttempts(0);
         setStep("RECEIPT_SUCCESS");
       } else {
         setErrorMessage(data.message);
         setReceiptData(data.data || null);
         setValidationAttempts(prev => prev + 1);
         setStep("RECEIPT_ERROR");
       }
     } catch (error) {
       setErrorMessage("Erro de conexão. Tente novamente.");
       setValidationAttempts(prev => prev + 1);
       setStep("RECEIPT_ERROR");
     }
   };
 
   const handleManualSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     const value = parseFloat(manualData.value.replace(',', '.'));
     if (isNaN(value) || value < 15) {
       alert("O valor deve ser no mínimo R$ 15,00");
       return;
     }
     const data = {
       store: manualData.store || "Loja Manual",
       value: value,
       validationToken: crypto.randomUUID()
     };
     setReceiptData(data);
     saveToHistory(data);
     triggerConfetti();
     setStep("RECEIPT_SUCCESS");
   };
 
   const handleTicketChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       setTicketFile(file);
       setTicketPreview(URL.createObjectURL(file));
       validateTicket(file);
     }
   };
 
  const validateTicket = async (_file: File) => {
     setStep("VALIDATING_TICKET");
     await new Promise(resolve => setTimeout(resolve, 1500));
     setStep("SUCCESS_FINAL");
   };
 
   const generateTotemCode = async () => {
     setStep("VALIDATING_TICKET");
     await new Promise(resolve => setTimeout(resolve, 1000));
     setTotemCode(Math.floor(100000 + Math.random() * 900000).toString());
    setTotemExpiresAt(Date.now() + 15 * 60 * 1000);
     setStep("SHOW_TOTEM_CODE");
   };
 
   const resetFlow = () => {
     setStep("UPLOAD_RECEIPT");
     setReceiptFile(null);
     setReceiptPreview(null);
     setTicketFile(null);
     setTicketPreview(null);
     setReceiptData(null);
     setErrorMessage("");
     setTotemCode("");
    setTotemExpiresAt(null);
    setTotemRemaining(0);
   };
 
   const formatCurrency = (val: number) => {
     return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
   };
  const formatTime = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (step !== "SHOW_TOTEM_CODE" || !totemExpiresAt) return;
    const id = setInterval(() => {
      const remaining = totemExpiresAt - Date.now();
      setTotemRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, [step, totemExpiresAt]);
 
   return (
    <div className="w-full max-w-4xl mx-auto bg-white shadow-xl overflow-hidden min-h-screen flex flex-col font-sans">
      
      {/* RioMar Header Simulation */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="bg-riomar-blue text-white text-[10px] py-1 px-4 flex justify-between items-center">
          <div className="flex gap-4">
             <span>FORTALEZA</span>
             <span className="opacity-50">|</span>
             <span>HORÁRIOS</span>
          </div>
          <div className="flex gap-4">
             <span>LOGIN</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 md:px-8 h-20">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-gray-600">
              <Menu className="w-6 h-6" />
            </button>
            {/* Logo Text if Image not available */}
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-bold tracking-tight text-riomar-blue">RioMar</span>
              <span className="text-xs tracking-widest text-riomar-teal uppercase font-semibold">Fortaleza</span>
            </div>
          </div>

          <nav className="hidden md:flex gap-6 text-sm font-bold text-gray-600">
             <a href="#" className="hover:text-riomar-teal transition-colors">LOJAS</a>
             <a href="#" className="hover:text-riomar-teal transition-colors">GASTRONOMIA</a>
             <a href="#" className="hover:text-riomar-teal transition-colors">CINEMA</a>
             <a href="#" className="hover:text-riomar-teal transition-colors">EVENTOS</a>
             <a href="#" className="text-riomar-teal border-b-2 border-riomar-teal pb-1">SERVIÇOS</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHistory(true)}
              className="p-2 text-gray-400 hover:text-riomar-teal relative"
            >
              <History className="w-5 h-5" />
              {history.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <button className="p-2 text-gray-400 hover:text-riomar-teal">
              <Search className="w-5 h-5" />
            </button>
            <button className="hidden md:block p-2 text-gray-400 hover:text-riomar-teal">
              <MapPin className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-riomar-blue flex items-center gap-2">
                  <History className="w-4 h-4" /> Histórico
                </h3>
                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-200 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Nenhuma validação recente</p>
                  </div>
                ) : (
                  history.map(item => (
                    <div key={item.id} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{item.store}</p>
                        <p className="text-xs text-gray-500">{item.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-riomar-teal text-sm">{formatCurrency(item.value)}</p>
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Aprovado</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 bg-gray-50 flex flex-col items-center py-8 px-4">
        
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-riomar-teal p-6 text-white text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
             <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-full -ml-10 -mb-10 blur-xl"></div>
             <h1 className="text-2xl font-bold relative z-10 font-heading">Valida Estacionamento</h1>
             <p className="text-teal-50 text-sm relative z-10 mt-1">Valide seu ticket com notas fiscais</p>
          </div>

          <div className="p-6 min-h-[400px] flex flex-col relative">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: Upload Receipt */}
              {step === "UPLOAD_RECEIPT" && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col items-center justify-center space-y-6"
                >
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Receipt className="w-8 h-8 text-riomar-teal" />
                    </div>
                    <h2 className="text-lg font-bold text-riomar-blue">Escaneie sua nota</h2>
                    <p className="text-gray-500 text-sm px-2 leading-relaxed">
                      Para validar seu estacionamento, envie uma foto da nota fiscal. 
                      <br/>
                      <span className="text-riomar-accent font-semibold text-xs bg-orange-50 px-2 py-1 rounded-full mt-2 inline-block">Mínimo R$ 15,00</span>
                    </p>
                  </div>

                  <div className="w-full mt-4">
                    <button
                      onClick={() => receiptInputRef.current?.click()}
                      className="w-full py-4 bg-riomar-teal hover:bg-riomar-teal-dark active:scale-[0.98] text-white rounded-lg shadow-md shadow-teal-100 transition-all flex items-center justify-center gap-3 font-bold uppercase tracking-wide text-sm"
                    >
                      <Camera className="w-5 h-5" />
                      Tirar Foto da Nota
                    </button>
                    <input
                      ref={receiptInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleReceiptChange}
                    />
                    <p className="text-center text-xs text-gray-400 mt-4">
                      Formatos aceitos: JPG, PNG
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Validating Receipt */}
              {step === "VALIDATING_RECEIPT" && (
                <motion.div
                  key="validating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center space-y-6 text-center w-full"
                >
                  <div className="relative w-full max-w-[200px] aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mx-auto">
                    {receiptPreview && (
                      <img src={receiptPreview} alt="Receipt" className="w-full h-full object-cover opacity-50 blur-[2px]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-400/20 to-transparent w-full h-1/2 animate-[scan_2s_ease-in-out_infinite]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/90 p-4 rounded-full shadow-lg">
                        <Loader2 className="w-8 h-8 text-riomar-teal animate-spin" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-riomar-blue">Analisando nota...</h3>
                    <p className="text-gray-500 text-sm mt-1">Aguarde um momento</p>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Receipt Error */}
              {step === "RECEIPT_ERROR" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex-1 flex flex-col items-center justify-center space-y-6 text-center"
                >
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
                    <X className="w-8 h-8 text-red-500" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-riomar-blue">Não foi possível validar</h3>
                    <p className="text-gray-600 text-sm px-4">{errorMessage}</p>
                    {receiptData?.value && (
                      <div className="mt-4 bg-gray-50 py-2 px-4 rounded-lg inline-block">
                         <p className="text-gray-500 text-xs uppercase tracking-wide">Valor identificado</p>
                         <p className="text-riomar-blue font-bold text-lg">{formatCurrency(receiptData.value)}</p>
                      </div>
                    )}
                  </div>

                  <div className="w-full space-y-3 mt-4">
                    <button
                      onClick={resetFlow}
                      className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm uppercase tracking-wide transition-colors"
                    >
                      Tentar Novamente
                    </button>

                    {validationAttempts >= 2 && (
                      <button
                        onClick={() => setStep("MANUAL_INPUT")}
                        className="w-full py-3 border border-gray-200 hover:border-riomar-teal text-riomar-teal rounded-lg font-bold text-sm uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" /> Digitar Manualmente
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Success & Choose Method */}
              {(step === "RECEIPT_SUCCESS" || step === "CHOOSE_VALIDATION") && (
                <motion.div
                  key="success_choose"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col space-y-6"
                >
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg flex items-center gap-4 shadow-sm">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-green-900 text-sm uppercase">Nota Aprovada</h3>
                      <div className="flex flex-col mt-1">
                        <p className="text-green-700 text-xs">
                          Loja: <span className="font-bold">{receiptData?.store}</span>
                        </p>
                        <p className="text-green-700 text-xs">
                          Valor: <span className="font-bold text-sm">{formatCurrency(receiptData?.value || 0)}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    <p className="text-center text-riomar-blue font-bold mb-4 text-sm uppercase tracking-wide">
                      Escolha como validar
                    </p>

                    <button
                      onClick={() => {
                        setStep("SCAN_TICKET");
                        setTimeout(() => ticketInputRef.current?.click(), 300);
                      }}
                      className="group w-full p-4 bg-white border border-gray-200 hover:border-riomar-teal hover:shadow-md rounded-xl transition-all text-left flex items-center gap-4"
                    >
                      <div className="w-10 h-10 bg-blue-50 group-hover:bg-teal-50 rounded-full flex items-center justify-center transition-colors">
                        <QrCode className="w-5 h-5 text-riomar-blue group-hover:text-riomar-teal" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-riomar-blue text-sm">Ler QR Code</h4>
                        <p className="text-xs text-gray-500">Escaneie o ticket físico</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-riomar-teal" />
                    </button>
                    <input
                      ref={ticketInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleTicketChange}
                    />

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-gray-200"></div>
                      <span className="flex-shrink-0 mx-4 text-gray-300 text-[10px] uppercase font-bold">ou</span>
                      <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <button
                      onClick={generateTotemCode}
                      className="group w-full p-4 bg-white border border-gray-200 hover:border-riomar-teal hover:shadow-md rounded-xl transition-all text-left flex items-center gap-4"
                    >
                      <div className="w-10 h-10 bg-gray-50 group-hover:bg-teal-50 rounded-full flex items-center justify-center transition-colors">
                        <Ticket className="w-5 h-5 text-gray-600 group-hover:text-riomar-teal" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-riomar-blue text-sm">Gerar Código</h4>
                        <p className="text-xs text-gray-500">Para digitar no totem</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-riomar-teal" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: Validating Ticket */}
              {(step === "VALIDATING_TICKET") && (
                <motion.div
                  key="validating_ticket"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center space-y-6 text-center"
                >
                  <Loader2 className="w-10 h-10 text-riomar-teal animate-spin" />
                  <h3 className="text-sm font-bold text-riomar-blue uppercase tracking-wide">Processando...</h3>
                </motion.div>
              )}

              {/* STEP 6: Show Totem Code */}
              {step === "SHOW_TOTEM_CODE" && (
                <motion.div
                  key="totem_code"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col items-center justify-center space-y-8"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-riomar-blue">Código de Validação</h3>
                    <p className="text-gray-500 text-xs">Digite no totem de pagamento</p>
                  </div>

                  <div className="bg-riomar-blue text-white w-full py-8 rounded-lg shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <div className="text-center relative z-10">
                       <span className="font-mono text-4xl font-bold tracking-[0.2em]">{totemCode}</span>
                    </div>
                  </div>

                  {totemExpiresAt && totemRemaining > 0 ? (
                    <div className="flex items-center gap-2 text-riomar-accent bg-orange-50 px-4 py-2 rounded-full text-xs font-bold border border-orange-100">
                      <AlertCircle className="w-4 h-4" />
                      Expira em {formatTime(totemRemaining)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-full text-xs font-bold border border-red-100">
                      <AlertCircle className="w-4 h-4" />
                      Código expirado
                    </div>
                  )}

                  <button
                    onClick={generateTotemCode}
                    className="w-full py-3 bg-riomar-teal text-white rounded-lg font-bold text-xs uppercase tracking-wide hover:bg-riomar-teal-dark"
                  >
                    Gerar novo código
                  </button>

                  <button
                    onClick={resetFlow}
                    className="text-riomar-teal font-bold text-sm hover:underline mt-4 uppercase tracking-wide"
                  >
                    Voltar ao início
                  </button>
                </motion.div>
              )}

 
              {/* STEP 7: Success Final */}
              {step === "SUCCESS_FINAL" && (
                <motion.div
                  key="success_final"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col items-center justify-center space-y-6 text-center"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-sm animate-bounce">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-riomar-blue">Tudo Certo!</h2>
                    <p className="text-gray-500 text-sm">Estacionamento liberado.</p>
                  </div>

                  <div className="w-full pt-8">
                     <button
                      onClick={resetFlow}
                      className="w-full py-4 bg-riomar-blue text-white rounded-lg font-bold uppercase tracking-wide text-sm shadow-lg hover:bg-gray-800 transition-colors"
                    >
                      Validar Outro
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP: Manual Input */}
              {step === "MANUAL_INPUT" && (
                <motion.div
                  key="manual"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex-1 flex flex-col space-y-6 w-full"
                >
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-riomar-blue">Entrada Manual</h3>
                    <p className="text-gray-500 text-sm">Digite os dados da nota fiscal</p>
                  </div>

                  <form onSubmit={handleManualSubmit} className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Nome da Loja</label>
                      <input
                        type="text"
                        required
                        className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-riomar-teal focus:border-transparent outline-none transition-all"
                        placeholder="Ex: McDonald's"
                        value={manualData.store}
                        onChange={e => setManualData({...manualData, store: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Valor Total (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="15"
                        required
                        className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-riomar-teal focus:border-transparent outline-none transition-all text-lg font-mono"
                        placeholder="0,00"
                        value={manualData.value}
                        onChange={e => setManualData({...manualData, value: e.target.value})}
                      />
                      <p className="text-xs text-orange-500 font-semibold">* Mínimo R$ 15,00</p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg flex gap-3 items-start">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 leading-relaxed">
                        A validação manual está sujeita a auditoria. Guarde sua nota fiscal física para conferência na saída.
                      </p>
                    </div>

                    <div className="pt-4 space-y-3">
                      <button
                        type="submit"
                        className="w-full py-4 bg-riomar-teal hover:bg-riomar-teal-dark text-white rounded-lg font-bold uppercase tracking-wide shadow-md transition-all"
                      >
                        Validar
                      </button>
                      <button
                        type="button"
                        onClick={resetFlow}
                        className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm font-bold uppercase"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Info Cards imitating website footer/promos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mt-8">
           <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-riomar-teal">
              <h3 className="font-bold text-riomar-blue text-sm mb-1">Horário de Funcionamento</h3>
              <p className="text-xs text-gray-500">Seg a Sáb: 10h às 22h<br/>Dom: 13h às 21h</p>
           </div>
           <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-riomar-accent">
              <h3 className="font-bold text-riomar-blue text-sm mb-1">Eventos</h3>
              <p className="text-xs text-gray-500">Confira a programação completa no app.</p>
           </div>
           <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-riomar-blue">
              <h3 className="font-bold text-riomar-blue text-sm mb-1">Ajuda</h3>
              <p className="text-xs text-gray-500">Dúvidas sobre o estacionamento? Fale conosco.</p>
           </div>
        </div>

      </main>

      {/* Footer Simulation */}
      <footer className="bg-riomar-blue text-white py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="text-center md:text-left">
              <p className="font-bold text-lg">RioMar Fortaleza</p>
              <p className="text-xs text-gray-400 mt-1">R. Des. Lauro Nogueira, 1500 - Papicu, Fortaleza - CE</p>
           </div>
           <div className="flex gap-4">
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-riomar-teal transition-colors cursor-pointer">
                 <span className="text-xs">IG</span>
              </div>
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-riomar-teal transition-colors cursor-pointer">
                 <span className="text-xs">FB</span>
              </div>
           </div>
        </div>
        <div className="max-w-4xl mx-auto mt-8 pt-4 border-t border-white/10 text-center text-[10px] text-gray-500">
           © 2026 RioMar Fortaleza. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
