import { Router } from 'express';
import { anthropicService } from '../services/anthropic.service';
import { ChatRequest } from '../types/chat.types';

const router = Router();

router.post('/', async (req, res) => {
  const { userMessage, use1HourCache, includeLargeDocument, includeTools, resetConversation } = req.body as ChatRequest;

  // The 'messages' array from the client is not used here because the backend service
  // maintains its own stateful conversation history for this demo. The 'resetConversation'
  // flag controls the state of that history.
  try {
    const response = await anthropicService.getChatResponse({
      messages: [], // Ignored by service in favor of its internal history
      userMessage,
      use1HourCache,
      includeLargeDocument,
      includeTools,
      resetConversation,
    });
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
