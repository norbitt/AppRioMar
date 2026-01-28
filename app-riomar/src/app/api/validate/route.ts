import { NextResponse } from "next/server";
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

function extractDataFromText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Store Name Heuristic
  // Ignore common fiscal headers to find the real store name
  const ignoredHeaders = [
    "DANFE", "NFC-E", "DOCUMENTO AUXILIAR", "NOTA FISCAL", 
    "CNPJ", "IE", "ENDERECO", "RUA", "AV", "MONITOR", "PAGINA",
    "CUPOM", "EXTRATO", "BR"
  ];

  let storeName = "Estabelecimento Comercial";
  
  // Scan first 10 lines for the store name
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    // Check if line is a likely header or garbage
    const isHeader = ignoredHeaders.some(h => upperLine.includes(h));
    // Garbage: too short, only numbers, or special chars only
    const isGarbage = line.length < 3 || line.match(/^[\d\W]+$/); 

    if (!isHeader && !isGarbage) {
      // Clean up leading special chars (e.g. "- McDonald's" -> "McDonald's")
      storeName = line.replace(/^[^a-zA-Z0-9]+/, '');
      // If result is still valid, use it
      if (storeName.length > 2) break;
    }
  }

  // Value Extraction Heuristic
  let detectedValue = 0;

  // Regex strategies for finding total
  // Matches: "TOTAL R$ 22,90", "TOTAL 22.90", "VALOR TOTAL ... 30,00"
  // Allow some noise between TOTAL and the value
  const totalRegex = /(?:TOTAL|VALOR|PAGAR|SUBTOTAL)[\w\W]{0,20}?(?:R\$)?\s*(\d+[.,]\d{2})/i;
  
  // Combine all text for regex search if line-by-line fails
  // But first try line by line for precision
  for (const line of lines) {
    const match = line.match(totalRegex);
    if (match) {
      const valueStr = match[1].replace(',', '.');
      const val = parseFloat(valueStr);
      // Update only if it looks like a valid total
      if (val > detectedValue && val < 10000) {
        detectedValue = val;
      }
    }
  }
  
  // Strategy 2: Scan for "R$ XX,XX" explicitly
  if (detectedValue === 0) {
    const currencyRegex = /R\$\s*(\d+[.,]\d{2})/gi;
    let match;
    while ((match = currencyRegex.exec(text)) !== null) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (val > detectedValue && val < 10000) {
        detectedValue = val;
      }
    }
  }

  // Strategy 3: Last resort, find any number XX,XX and take the max
  if (detectedValue === 0) {
    const numberRegex = /(\d{2,}[.,]\d{2})/g;
    const allValues: number[] = [];
    let match;
    while ((match = numberRegex.exec(text)) !== null) {
      const val = parseFloat(match[1].replace(',', '.'));
      
      // Filter out likely dates (years like 2024, 2025)
      // Current year check: 2024, 2025, 2026 are likely dates, not prices (unless it's a very expensive dinner)
      // Also filter out small integers that might be quantities (if they have .00) - hard to distinguish
      const isLikelyYear = val >= 2023 && val <= 2030 && Number.isInteger(val);
      
      if (val < 5000 && !isLikelyYear) { 
        allValues.push(val);
      }
    }
    if (allValues.length > 0) {
      detectedValue = Math.max(...allValues);
    }
  }

  return { storeName, value: detectedValue };
}

export async function POST(request: Request) {
  try {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { valid: false, message: "Nenhum arquivo enviado." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Pre-process image with Sharp for better OCR
    // 1. Grayscale
    // 2. Resize (upscale) to improve text clarity
    // 3. Normalize/Contrast
    // 4. Threshold (Binarization) - helps significantly with receipts
    const processedBuffer = await sharp(buffer)
      .resize(1500, null, { fit: 'inside' }) // Increased resolution
      .grayscale()
      .normalize()
      .threshold(160) // Binarize image (black text on white bg)
      .sharpen()
      .toBuffer();

    console.log("Iniciando OCR...");
    
    // Initialize Tesseract Worker
    const worker = await createWorker(['por', 'eng']); 
    
    // Set parameters to improve accuracy for tabular data
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$-:/ ',
      preserve_interword_spaces: '1',
    });
    
    const { data: { text } } = await worker.recognize(processedBuffer);
    await worker.terminate();

    console.log("--- OCR Raw Text Start ---");
    console.log(text.substring(0, 300)); 
    console.log("--- OCR Raw Text End ---");

    const { storeName, value } = extractDataFromText(text);
    
    console.log(`Dados Extraídos -> Loja: "${storeName}", Valor: ${value}`);
    const detectedValue = value;
    const minimumValue = 15.00;

    if (detectedValue >= minimumValue) {
      const validationToken = crypto.randomUUID();
      
      return NextResponse.json({
        valid: true,
        message: "Nota fiscal validada com sucesso!",
        data: {
          value: detectedValue,
          store: storeName,
          date: new Date().toLocaleDateString('pt-BR'),
          validationToken: validationToken
        }
      }, { headers: corsHeaders });
    } else if (detectedValue > 0) {
       return NextResponse.json({
        valid: false,
        message: `Valor identificado (R$ ${detectedValue.toFixed(2).replace('.', ',')}) é inferior ao mínimo de R$ 15,00.`,
        data: {
           value: detectedValue,
           store: storeName
        }
      }, { headers: corsHeaders });
    } else {
       return NextResponse.json({
        valid: false,
        message: "Não foi possível identificar o valor total na nota fiscal. Tente uma foto mais nítida.",
        data: { value: 0, store: storeName }
      }, { headers: corsHeaders });
    }

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { valid: false, message: "Erro ao processar a imagem da nota fiscal." },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
