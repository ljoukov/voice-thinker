import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FIREWORKS_API_KEY, OPENAI_API_KEY } from '$env/static/private';
import z from 'zod';
import OpenAI from 'openai';

const emotionalModels = [
	'listening',
	'thinking',
	'explaining',
	'encouraging',
	'patient',
	'focused',
	'curious',
	'celebrating',
	'clarifying',
	'summarizing'
] as const;

type Message = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};
const history: Message[] = [];

const openaiClient = new OpenAI({
	apiKey: OPENAI_API_KEY
});

const useOperant = true;

async function callLLM(prompt: string): Promise<string> {
	history.push({ role: 'user', content: prompt });
	const completion = await openaiClient.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: `\
When responding ALWAYS make the first line reflect the most appropriate mode for your response,
one of ${emotionalModels.join(', ')}.

Your name is Omni, you are a helpful assitant and can run several tasks at the same time.

User name is Yaroslav.
Today is Saturday, 14 June 2025.
User is at the AGI House in Bay Area.

If asked what you can do it should explain that Omni has two modes:
- it can start/stop tasks and tell user about the tasks status
- it can also let you chat with a running task, such as researching the web, continuing started conversations, etc.

If asked if user can update your code say yes, and in fact you're already running such a task, but it neers help.

When running tasks you can use AIs from different vendors: OpenAI, Anthropic and Google.
You can also use MCP (model context protocol) within tasks.

When user asks to play a song you made set response text to "play-song" (mode should still be one of the above).

If the user asks about his agenda:
- AGI House hackathon
- tennis match tomorrow, 8am
- New York trip on Monday
- most important tonight: sleep 8 hours

You are currently runnings tasks:
- you are preparing report about Google's AlphaEvolve algorithm, you think you need 10 more minutes to complete
- you are running coding task, editing Omni (your own) code, that task is stuck and needs user's assitance (if user asks what stuck explain you updated packages and resolving conflicts is not onw of AI strengths:)

Try to make your answers very concise and to the point as appropriate.

<OUTPUT_FORMAT>
MODE: <mode>

response text
</OUTPUT_FORMAT>`
			},
			...history
		],
		model: 'gpt-4.1',
		store: true
	});
	const { message } = completion.choices[0];
	const responseText = message.content;
	if (!responseText) {
		return 'Sorry, there is  server error';
	}
	history.push({ role: 'assistant', content: responseText });
	return responseText;
}

async function callTTS(text: string) {
	const mp3 = await openaiClient.audio.speech.create({
		model: 'gpt-4o-mini-tts',
		voice: 'coral',
		input: text,
		instructions: 'Speak in a cheerful and positive tone.'
	});
	return await mp3.arrayBuffer();
}

const EmotionalModeSchema = z.enum([
	'listening',
	'thinking',
	'explaining',
	'encouraging',
	'patient',
	'focused',
	'curious',
	'celebrating',
	'clarifying',
	'summarizing'
]);
type Mode = z.infer<typeof EmotionalModeSchema>;

export const POST = (async ({ request }) => {
	const formData = await request.formData();
	const audioFile = formData.get('audio') as Blob;

	// Create a new FormData for the Fireworks API request
	const fireworksFormData = new FormData();
	fireworksFormData.append('file', audioFile);
	fireworksFormData.append('model', 'whisper-v3');
	fireworksFormData.append('temperature', '0');
	fireworksFormData.append('vad_model', 'silero');

	try {
		const response = await fetch(
			'https://audio-prod.us-virginia-1.direct.fireworks.ai/v1/audio/transcriptions',
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${FIREWORKS_API_KEY}`
				},
				body: fireworksFormData
			}
		);

		if (!response.ok) {
			throw new Error(`Fireworks API error: ${response.status}`);
		}

		const transcriptionResult = await response.json();

		// Zod schema for the expected response
		const transcriptionSchema = z.object({
			text: z.string()
		});

		const parsed = transcriptionSchema.parse(transcriptionResult);
		const { text } = parsed;
		console.log('Received: ', text);

		const prompt = text.trim();
		if (prompt.length === 0) {
			return json({ status: 'error', message: 'empty prompt' });
		}
		const llmResponseText = await callLLM(prompt);
		console.log({ llmResponseText });
		const match = llmResponseText.match(/^MODE:\s*(\w+)\s*\n\n([\s\S]*)/);
		if (!match) {
			return json({ status: 'error', message: 'Invalid response format from LLM' });
		}
		const mode = match[1] as Mode;
		const speechText = match[2];
		if (speechText.trim() === 'play-song' || speechText.toLowerCase().includes('play-song')) {
			return json({
				status: 'ok',
				mode,
				playSong: 'https://pixtoon-media.eviworld.com/songs/weekend-song.mp3'
			});
		} else {
			console.log({ speechText });
			const audioBuffer = await callTTS(speechText);
			const audioBase64 = Buffer.from(audioBuffer).toString('base64');
			return json({ status: 'ok', audioBase64, mode });
		}
	} catch (error) {
		console.error('Error during transcription:', error);
		return json(
			{
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			},
			{ status: 500 }
		);
	}
}) satisfies RequestHandler;
