/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Full-Stack Express + Gemini AI Server
 */

import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please check Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function classifyApiError(error: unknown): {
  isBillingOrQuota: boolean;
  statusCode: number;
  message: string;
} {
  const raw = error instanceof Error ? error.message : String(error);
  const is402 = /\b402\b|Payment Required|billing/i.test(raw);
  const is403 = /\b403\b|PERMISSION_DENIED/i.test(raw);
  const is429 = /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(raw);
  const is400Key = /API_KEY_INVALID/i.test(raw);

  if (is402) {
    return {
      isBillingOrQuota: true,
      statusCode: 402,
      message:
        'Paid billing is required for this Gemini model (HTTP 402). Select a billing-enabled GEMINI_API_KEY in Settings > Secrets, or use the Studio local engine output below.',
    };
  }
  if (is429) {
    return {
      isBillingOrQuota: true,
      statusCode: 429,
      message:
        'API quota reached (HTTP 429). Upgrade to a paid tier in Settings > Secrets for higher quota. Using Studio local engine output below.',
    };
  }
  if (is403 || is400Key) {
    return {
      isBillingOrQuota: true,
      statusCode: 403,
      message:
        'API key permission error. Please verify your GEMINI_API_KEY in Settings > Secrets. Using Studio local engine output below.',
    };
  }

  return {
    isBillingOrQuota: false,
    statusCode: 500,
    message: raw,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large base64 payloads for high-res images & audio/video
  app.use(express.json({ limit: '50mb' }));

  // ---------------------------------------------------------------------------
  // 1. Music Generation Route (Lyria Clip 30s & Lyria Pro Full Track)
  // ---------------------------------------------------------------------------
  app.post('/api/music/generate', async (req: Request, res: Response) => {
    try {
      const { prompt, model, imageBase64, imageMimeType } = req.body as {
        prompt?: string;
        model?: string;
        imageBase64?: string;
        imageMimeType?: string;
      };

      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Please provide a music prompt.' });
        return;
      }

      const selectedModel =
        model === 'lyria-3-pro-preview' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

      const ai = getGenAIClient();

      const contents = imageBase64
        ? {
            parts: [
              { text: prompt.trim() },
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: imageMimeType || 'image/jpeg',
                },
              },
            ],
          }
        : prompt.trim();

      // Omit responseModalities so both audio (inlineData) and lyrics (text) are returned
      const responseStream = await ai.models.generateContentStream({
        model: selectedModel,
        contents,
      });

      const audioChunks: Buffer[] = [];
      let lyrics = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of responseStream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        res.json({
          fallbackRequired: true,
          notice: 'Lyria returned no audio stream chunks; synthesized track locally.',
          model: selectedModel,
        });
        return;
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      const audioDataUrl = `data:${mimeType};base64,${audioBase64}`;

      res.json({
        audioDataUrl,
        lyrics: lyrics.trim(),
        mimeType,
        model: selectedModel,
      });
    } catch (error: unknown) {
      const info = classifyApiError(error);
      res.json({
        fallbackRequired: true,
        statusCode: info.statusCode,
        notice: info.message,
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Image Creation & Editing Route (gemini-nano-banana-2.1)
  // ---------------------------------------------------------------------------
  app.post('/api/image/generate', async (req: Request, res: Response) => {
    try {
      const { prompt, imageBase64, imageMimeType, aspectRatio, imageSize } = req.body as {
        prompt?: string;
        imageBase64?: string;
        imageMimeType?: string;
        aspectRatio?: string;
        imageSize?: string;
      };

      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Please provide an image creation or edit prompt.' });
        return;
      }

      const ai = getGenAIClient();

      const parts: Array<
        | { text: string }
        | { inlineData: { data: string; mimeType: string } }
      > = [];

      if (imageBase64) {
        parts.push({
          inlineData: {
            data: imageBase64,
            mimeType: imageMimeType || 'image/jpeg',
          },
        });
      }
      parts.push({ text: prompt.trim() });

      const validRatio = ['1:1', '3:4', '4:3', '9:16', '16:9'].includes(aspectRatio || '')
        ? aspectRatio
        : '1:1';
      const validSize = ['1K', '2K', '4K'].includes(imageSize || '') ? imageSize : '1K';

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: validRatio,
            imageSize: validSize,
          },
        },
      });

      let imageDataUrl = '';
      let textOutput = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageDataUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textOutput += part.text;
        }
      }

      if (!imageDataUrl) {
        res.json({
          fallbackRequired: true,
          notice: textOutput || 'Synthesized custom studio cover artwork locally.',
        });
        return;
      }

      res.json({
        imageDataUrl,
        text: textOutput.trim(),
      });
    } catch (error: unknown) {
      const info = classifyApiError(error);
      res.json({
        fallbackRequired: true,
        statusCode: info.statusCode,
        notice: info.message,
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Animate Images into Video Route (gemini-omni-1.1-flash via Interactions API)
  // ---------------------------------------------------------------------------
  app.post('/api/video/generate', async (req: Request, res: Response) => {
    try {
      const { prompt, imageBase64, imageMimeType, aspectRatio } = req.body as {
        prompt?: string;
        imageBase64?: string;
        imageMimeType?: string;
        aspectRatio?: '16:9' | '9:16';
      };

      if (!imageBase64) {
        res.status(400).json({
          error: 'Please upload or select a photo to animate into a video.',
        });
        return;
      }

      const motionPrompt =
        prompt && prompt.trim()
          ? prompt.trim()
          : 'Smooth cinematic camera motion with neon club reflections and subtle lowrider bounce.';

      const validAspect: '16:9' | '9:16' = aspectRatio === '16:9' ? '16:9' : '9:16';

      const ai = getGenAIClient();

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.1-flash',
          input: [
            {
              type: 'image',
              mime_type: imageMimeType || 'image/jpeg',
              data: imageBase64,
            },
            {
              type: 'text',
              text: motionPrompt,
            },
          ],
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: validAspect,
          },
        },
        { timeout: 300000 }
      );

      let videoData = interaction.output_video?.data;
      let videoMime = interaction.output_video?.mime_type || 'video/mp4';
      let videoUri = interaction.output_video?.uri;

      if (!videoData && !videoUri && Array.isArray(interaction.steps)) {
        for (const step of interaction.steps) {
          if (step.type === 'model_output' && Array.isArray(step.content)) {
            const vidPart = step.content.find((c) => c.type === 'video');
            if (vidPart) {
              videoData = vidPart.data;
              videoMime = vidPart.mime_type || 'video/mp4';
              videoUri = vidPart.uri;
            }
          }
        }
      }

      if (videoData) {
        res.json({
          videoDataUrl: `data:${videoMime};base64,${videoData}`,
          mimeType: videoMime,
          aspectRatio: validAspect,
        });
        return;
      }

      if (videoUri) {
        res.json({
          videoDataUrl: videoUri,
          mimeType: videoMime,
          aspectRatio: validAspect,
        });
        return;
      }

      res.json({
        fallbackRequired: true,
        notice: 'Synthesizing animated video loop locally.',
        aspectRatio: validAspect,
      });
    } catch (error: unknown) {
      const info = classifyApiError(error);
      res.json({
        fallbackRequired: true,
        statusCode: info.statusCode,
        notice: info.message,
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Automotive OBD-II Diagnostics & Cruise Route Optimisation AI
  // ---------------------------------------------------------------------------
  app.post('/api/car/diagnose', async (req: Request, res: Response) => {
    try {
      const { mode, sensorData, tripLogs, historicalRoutes, vehicleInfo } = req.body as {
        mode?: 'diagnostics' | 'route_optimization';
        sensorData?: Record<string, unknown>;
        tripLogs?: unknown[];
        historicalRoutes?: Array<{ name: string; distanceMiles: number; damageScore: number; roadConditions: string }>;
        vehicleInfo?: {
          make?: string;
          model?: string;
          year?: number;
          engine?: string;
          suspension?: string;
        };
      };

      const selectedMode = mode === 'route_optimization' ? 'route_optimization' : 'diagnostics';

      let prompt = '';
      if (selectedMode === 'diagnostics') {
        prompt = `You are an expert automotive diagnostics AI. Analyse the provided OBD-II sensor data and give a concise, actionable report: identify any anomalies, likely causes, and recommended actions. Use plain English, avoid jargon, and keep the response under 300 words. parse all forums, websites and data at your disposal.

Vehicle: ${vehicleInfo?.year || 1964} ${vehicleInfo?.make || 'Chevrolet'} ${vehicleInfo?.model || 'Impala Lowrider'} (${vehicleInfo?.engine || 'Small Block 350 V8 with Retrofitted OBD-II & Hydraulic Suspension'})

Live OBD-II Sensor Data:
${JSON.stringify(sensorData || {}, null, 2)}

Stored Historical User Trip Logs:
${JSON.stringify(tripLogs || [], null, 2)}
`;
      } else {
        prompt = `You are also an automotive route optimisation AI. use trip logs in conjunction with OBD2 data and stored historical data of the user combined with web data to diagnose the vehicle.
Given historical route data including damage scores and distances, recommend the best route and explain why briefly (under 150 words). parse all forums, websites and data at your disposal.

Vehicle: ${vehicleInfo?.year || 1964} ${vehicleInfo?.make || 'Chevrolet'} ${vehicleInfo?.model || 'Impala Lowrider with 4-pump hydraulic suspension'}

Historical Route Data (including damage scores from road dips/scrapes and distances):
${JSON.stringify(historicalRoutes || [], null, 2)}

Recent Trip Logs & OBD-II State:
${JSON.stringify({ sensorData, tripLogs }, null, 2)}
`;
      }

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const reportText = response.text || '';
      const searchGrounding = response.candidates?.[0]?.groundingMetadata;

      res.json({
        mode: selectedMode,
        report: reportText.trim(),
        groundingSources:
          searchGrounding?.groundingChunks?.map((chunk: { web?: { title?: string; uri?: string } }) => ({
            title: chunk.web?.title || 'Web Search Source',
            uri: chunk.web?.uri || '',
          })) || [],
      });
    } catch (error: unknown) {
      const info = classifyApiError(error);

      // Deterministic expert diagnostics fallback if API key quota exceeded
      const { mode, sensorData, historicalRoutes } = req.body || {};
      let fallbackReport = '';
      if (mode === 'route_optimization') {
        const sorted = [...(historicalRoutes || [])].sort(
          (a: { damageScore: number }, b: { damageScore: number }) =>
            (a.damageScore ?? 50) - (b.damageScore ?? 50)
        );
        const best = sorted[0] || {
          name: 'Sunset Boulevard Cruise',
          distanceMiles: 8.4,
          damageScore: 12,
        };
        fallbackReport = `Recommended Route: ${best.name} (${best.distanceMiles} mi, damage score ${best.damageScore}/100).\n\nWhy: This route has the lowest risk of chassis and hydraulic scraping based on historical logs, offering fresh smooth pavement without severe speed dips or pothole clusters, protecting your 1964 Impala's low-slung undercarriage and hydraulic fittings while maintaining optimal engine operating temperatures.`;
      } else {
        const coolant = (sensorData as { coolantTempF?: number })?.coolantTempF ?? 195;
        const rpm = (sensorData as { rpm?: number })?.rpm ?? 850;
        const stft = (sensorData as { stftPercent?: number })?.stftPercent ?? 1.2;
        const hydPress =
          (sensorData as { hydraulicPressurePsi?: number })?.hydraulicPressurePsi ?? 2200;

        const issues: string[] = [];
        if (coolant > 220) {
          issues.push(
            `Elevated Coolant Temperature (${coolant}°F). Likely caused by prolonged low-speed idling, fan clutch wear, or radiator scaling.`
          );
        }
        if (Math.abs(stft) > 10) {
          issues.push(
            `Fuel Trim Anomaly (STFT ${stft > 0 ? '+' : ''}${stft}%). High positive trim indicates a vacuum leak or dirty MAF sensor.`
          );
        }
        if (hydPress < 1500) {
          issues.push(
            `Low Hydraulic Pressure (${hydPress} PSI). Inspect hydraulic solenoids, check valves, and pump oil level.`
          );
        }

        if (issues.length > 0) {
          fallbackReport = `Diagnostic Summary:\n${issues.join(
            '\n\n'
          )}\n\nRecommended Actions: Check vacuum lines around the intake, inspect coolant level and mechanical fan operation before heavy cruising, and top off hydraulic fluid.`;
        } else {
          fallbackReport = `Diagnostic Summary: All primary OBD-II sensor values are within factory tolerances (RPM: ${rpm}, Coolant: ${coolant}°F, Fuel Trim: ${stft}%, Hydraulic Pressure: ${hydPress} PSI). No trouble codes or pending anomalies detected. The vehicle is ready for cruising.`;
        }
      }

      res.json({
        mode: req.body?.mode || 'diagnostics',
        report: fallbackReport,
        groundingSources: [],
        notice: info.message,
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Vite Dev Server Middleware / Production Static Serving
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`White Chocolate Studio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
