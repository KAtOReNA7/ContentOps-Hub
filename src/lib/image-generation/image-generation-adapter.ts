import type { ImageGenerationAdapter } from "@/lib/image-generation/image-generation-types";
import { OpenAIImage2Adapter } from "@/lib/image-generation/openai-image2-adapter";

export function createImageGenerationAdapter(): ImageGenerationAdapter {
  return new OpenAIImage2Adapter();
}

