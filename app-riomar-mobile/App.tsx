import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator, SafeAreaView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { validateReceipt } from "./src/api";

type Step = "UPLOAD_RECEIPT" | "VALIDATING_RECEIPT" | "RECEIPT_SUCCESS" | "RECEIPT_ERROR" | "CHOOSE_VALIDATION" | "SCAN_TICKET" | "VALIDATING_TICKET" | "SHOW_TOTEM_CODE" | "SUCCESS_FINAL";

export default function App() {
  const [step, setStep] = useState<Step>("UPLOAD_RECEIPT");
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [ticketUri, setTicketUri] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<{ value: number; store: string; validationToken?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [totemCode, setTotemCode] = useState<string>("");
  const [totemExpiresAt, setTotemExpiresAt] = useState<number | null>(null);
  const [totemRemaining, setTotemRemaining] = useState<number>(0);

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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };
  const formatTime = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const pickImage = async (onPick: (uri: string) => void) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets?.[0]?.uri) onPick(res.assets[0].uri);
  };

  const handlePickReceipt = async () => {
    await pickImage(async uri => {
      setReceiptUri(uri);
      setStep("VALIDATING_RECEIPT");
      setErrorMessage("");
      try {
        const result = await validateReceipt(uri);
        if (result.valid) {
          setReceiptData(result.data);
          setStep("RECEIPT_SUCCESS");
        } else {
          setErrorMessage(result.message);
          setReceiptData(result.data || null);
          setStep("RECEIPT_ERROR");
        }
      } catch {
        setErrorMessage("Erro de conexão. Tente novamente.");
        setStep("RECEIPT_ERROR");
      }
    });
  };

  const handlePickTicket = async () => {
    await pickImage(async uri => {
      setTicketUri(uri);
      setStep("VALIDATING_TICKET");
      setTimeout(() => setStep("SUCCESS_FINAL"), 1500);
    });
  };

  const generateTotemCode = async () => {
    setStep("VALIDATING_TICKET");
    setTimeout(() => {
      setTotemCode(Math.floor(100000 + Math.random() * 900000).toString());
      setTotemExpiresAt(Date.now() + 15 * 60 * 1000);
      setStep("SHOW_TOTEM_CODE");
    }, 1000);
  };

  const resetFlow = () => {
    setStep("UPLOAD_RECEIPT");
    setReceiptUri(null);
    setTicketUri(null);
    setReceiptData(null);
    setErrorMessage("");
    setTotemCode("");
    setTotemExpiresAt(null);
    setTotemRemaining(0);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, alignItems: "center", padding: 16 }}>
        <View style={{ width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View style={{ padding: 16, backgroundColor: "#00838F", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" }}>Valida Estacionamento</Text>
            <Text style={{ color: "#e0f2f1", fontSize: 12, textAlign: "center", marginTop: 4 }}>Valide seu ticket com notas fiscais</Text>
          </View>
          <View style={{ minHeight: 440, padding: 16 }}>
            {step === "UPLOAD_RECEIPT" && (
              <View style={{ alignItems: "center", gap: 12 }}>
                <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "700" }}>Escaneie sua nota</Text>
                <Text style={{ color: "#64748b", fontSize: 13 }}>Mínimo R$ 15,00</Text>
                <TouchableOpacity onPress={handlePickReceipt} style={{ width: "100%", paddingVertical: 14, backgroundColor: "#00838F", borderRadius: 12, alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Selecionar Foto da Nota</Text>
                </TouchableOpacity>
                {receiptUri && <Image source={{ uri: receiptUri }} style={{ width: 180, height: 240, borderRadius: 8 }} />}
                <Text style={{ color: "#94a3b8", fontSize: 11 }}>Formatos aceitos: JPG, PNG</Text>
              </View>
            )}

            {step === "VALIDATING_RECEIPT" && (
              <View style={{ alignItems: "center", gap: 16 }}>
                <ActivityIndicator size="large" color="#00838F" />
                <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "700" }}>Analisando nota...</Text>
                <Text style={{ color: "#64748b", fontSize: 13 }}>Aguarde um momento</Text>
              </View>
            )}

            {step === "RECEIPT_ERROR" && (
              <View style={{ alignItems: "center", gap: 16 }}>
                <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "700" }}>Não foi possível validar</Text>
                <Text style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>{errorMessage}</Text>
                {receiptData?.value ? <Text style={{ color: "#0f172a", fontSize: 18, fontWeight: "700" }}>{formatCurrency(receiptData.value)}</Text> : null}
                <TouchableOpacity onPress={resetFlow} style={{ width: "100%", paddingVertical: 12, backgroundColor: "#e2e8f0", borderRadius: 10, alignItems: "center" }}>
                  <Text style={{ color: "#334155", fontWeight: "700" }}>Tentar Novamente</Text>
                </TouchableOpacity>
              </View>
            )}

            {(step === "RECEIPT_SUCCESS" || step === "CHOOSE_VALIDATION") && (
              <View style={{ gap: 12 }}>
                <View style={{ backgroundColor: "#ecfdf5", padding: 12, borderRadius: 12 }}>
                  <Text style={{ color: "#065f46", fontSize: 12, fontWeight: "700" }}>Nota Aprovada</Text>
                  <Text style={{ color: "#047857", fontSize: 12 }}>Loja: <Text style={{ fontWeight: "700" }}>{receiptData?.store}</Text></Text>
                  <Text style={{ color: "#047857", fontSize: 12 }}>Valor: <Text style={{ fontWeight: "700" }}>{formatCurrency(receiptData?.value || 0)}</Text></Text>
                </View>
                <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "700", textAlign: "center" }}>Escolha como validar</Text>
                <TouchableOpacity onPress={handlePickTicket} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, borderRadius: 12 }}>
                  <View style={{ width: 40, height: 40, backgroundColor: "#eff6ff", borderRadius: 20 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#0f172a", fontWeight: "700" }}>Ler Ticket</Text>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>Envie a foto do ticket físico</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                  <Text style={{ color: "#cbd5e1", fontSize: 10, fontWeight: "700" }}>ou</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                </View>
                <TouchableOpacity onPress={generateTotemCode} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, borderRadius: 12 }}>
                  <View style={{ width: 40, height: 40, backgroundColor: "#f8fafc", borderRadius: 20 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#0f172a", fontWeight: "700" }}>Gerar Código</Text>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>Para digitar no totem</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {step === "VALIDATING_TICKET" && (
              <View style={{ alignItems: "center", gap: 16 }}>
                <ActivityIndicator size="large" color="#00838F" />
                <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "700" }}>Processando...</Text>
              </View>
            )}

            {step === "SHOW_TOTEM_CODE" && (
              <View style={{ alignItems: "center", gap: 16 }}>
                <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "700" }}>Código de Validação</Text>
                <Text style={{ color: "#64748b", fontSize: 12 }}>Digite no totem de pagamento</Text>
                <View style={{ width: "100%", paddingVertical: 24, backgroundColor: "#0f172a", borderRadius: 12, alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 32, letterSpacing: 6, fontFamily: "monospace", fontWeight: "700" }}>{totemCode}</Text>
                </View>
                {totemExpiresAt && totemRemaining > 0 ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ffedd5", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}>
                    <Text style={{ color: "#c2410c", fontSize: 12, fontWeight: "700" }}>Expira em {formatTime(totemRemaining)}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fee2e2", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}>
                    <Text style={{ color: "#dc2626", fontSize: 12, fontWeight: "700" }}>Código expirado</Text>
                  </View>
                )}
                <TouchableOpacity onPress={generateTotemCode} style={{ width: "100%", paddingVertical: 12, backgroundColor: "#00838F", borderRadius: 10, alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Gerar novo código</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={resetFlow} style={{ marginTop: 8 }}>
                  <Text style={{ color: "#00838F", fontSize: 12, fontWeight: "700" }}>Voltar ao início</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === "SUCCESS_FINAL" && (
              <View style={{ alignItems: "center", gap: 12 }}>
                <Text style={{ color: "#0f172a", fontSize: 20, fontWeight: "700" }}>Tudo Certo!</Text>
                <Text style={{ color: "#64748b", fontSize: 12 }}>Estacionamento liberado.</Text>
                <TouchableOpacity onPress={resetFlow} style={{ width: "100%", paddingVertical: 12, backgroundColor: "#0f172a", borderRadius: 10, alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Validar Outro</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
