import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { WasteType } from '@prisma/client';

const LABEL_TO_WASTE_TYPE: Record<string, WasteType> = {
  battery: WasteType.BATTERY,
  cardboard: WasteType.CARDBOARD,
  metal_can: WasteType.METAL,
  plastic_bottle: WasteType.PLASTIC,
  shoes: WasteType.SHOES,
  clothes: WasteType.CLOTHES,
};

export interface PredictionResult {
  wasteType: WasteType;
  label: string;
  confidence: number;
  allPredictions: { label: string; confidence: number }[];
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private model: tf.LayersModel | null = null;
  private labels: string[] = [];
  private readonly modelDir = path.join(process.cwd(), 'model');
  private readonly IMAGE_SIZE = 224;

  async onModuleInit() {
    await this.loadModel();
  }

  private async loadModel() {
    try {
      const metadataPath = path.join(this.modelDir, 'metadata.json');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      this.labels = metadata.labels;

      const modelJsonPath = path.join(this.modelDir, 'model.json');
      const modelJSON = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));

      const weightsPath = path.join(this.modelDir, 'weights.bin');
      const weightsBuffer = fs.readFileSync(weightsPath);
      const weightData = weightsBuffer.buffer.slice(
        weightsBuffer.byteOffset,
        weightsBuffer.byteOffset + weightsBuffer.byteLength,
      );

      const weightSpecs = modelJSON.weightsManifest[0].weights;

      const modelArtifacts = {
        modelTopology: modelJSON.modelTopology,
        weightSpecs,
        weightData,
        format: modelJSON.format,
        generatedBy: modelJSON.generatedBy,
        convertedBy: modelJSON.convertedBy,
      };

      this.model = await tf.loadLayersModel(tf.io.fromMemory(modelArtifacts));

      this.logger.log(`Model loaded with classes: ${this.labels.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to load model: ${error.message}`);
      throw error;
    }
  }

  async predict(imageBuffer: Buffer): Promise<PredictionResult> {
    if (!this.model) throw new Error('Model belum siap');

    const resized = await sharp(imageBuffer)
      .resize(this.IMAGE_SIZE, this.IMAGE_SIZE)
      .removeAlpha()
      .raw()
      .toBuffer();

    const tensor = tf.tidy(() => {
      const raw = new Float32Array(resized);
      // Normalize ke [-1, 1] sesuai preprocessing TM
      for (let i = 0; i < raw.length; i++) {
        raw[i] = raw[i] / 127.5 - 1;
      }
      return tf.tensor4d(raw, [1, this.IMAGE_SIZE, this.IMAGE_SIZE, 3]);
    });

    const output = this.model.predict(tensor) as tf.Tensor;
    const scores = await output.data();
    tensor.dispose();
    output.dispose();

    const allPredictions = this.labels.map((label, i) => ({
      label,
      confidence: Math.round(scores[i] * 10000) / 100,
    }));

    const best = allPredictions.reduce((a, b) =>
      a.confidence > b.confidence ? a : b,
    );

    return {
      wasteType: LABEL_TO_WASTE_TYPE[best.label],
      label: best.label,
      confidence: best.confidence,
      allPredictions,
    };
  }
}
