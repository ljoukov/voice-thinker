<script lang="ts">
	/// <reference types="svelte" />
	/// <reference types="@sveltejs/kit" />
	/// <reference types="svelte/elements" />
	/// <reference lib="dom" />

	let isActive = false;

	let mediaRecorder: MediaRecorder | null = null;
	let mediaStream: MediaStream | null = null;
	let chunks: Blob[] = [];

	let audioEl: HTMLAudioElement | null = null;
	let objectUrl: string | null = null;
	let mimeType: string | undefined;

	if (typeof window !== 'undefined') {
		audioEl = new Audio();
	}

	function pickMime(): string | undefined {
		if (typeof MediaRecorder === 'undefined') return undefined;
		const candidates = [
			'audio/webm;codecs=opus',
			'audio/webm',
			'audio/mp4;codecs=mp4a.40.2',
			'audio/mp4'
		];
		return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? undefined;
	}

	async function startRecording() {
		if (isActive || mediaRecorder) return;

		// stop any current playback and cleanup
		if (audioEl) {
			try {
				audioEl.pause();
				audioEl.currentTime = 0;
			} catch {}
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
				objectUrl = null;
			}
			audioEl.src = '';
		}

		try {
			mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mimeType = pickMime();
			chunks = [];
			mediaRecorder = mimeType
				? new MediaRecorder(mediaStream, { mimeType })
				: new MediaRecorder(mediaStream);

			mediaRecorder.ondataavailable = (e) => {
				if (e.data && e.data.size > 0) {
					chunks.push(e.data);
				}
			};

			mediaRecorder.onstop = async () => {
				const fallbackType = mimeType?.split(';')[0] ?? 'audio/webm';
				const ext = fallbackType.includes('mp4') ? 'mp4' : 'webm';
				const blob = new Blob(chunks, { type: fallbackType });

				// release the mic
				mediaStream?.getTracks().forEach((t) => t.stop());
				mediaStream = null;
				mediaRecorder = null;
				isActive = false;

				try {
					const fd = new FormData();
					fd.append('audio', blob, `recording.${ext}`);
					const res = await fetch('/api/command', { method: 'POST', body: fd });
					const json = (await res.json()) as
						| { status: 'ok'; audioBase64?: string; mode: string; playSong?: string }
						| { status: 'error'; message: string };

					if (json.status === 'ok') {
						if (!audioEl) return;
						if (json.audioBase64) {
							const bytes = base64ToUint8Array(json.audioBase64);
							const outBlob = new Blob([bytes], { type: 'audio/mp3' });
							objectUrl = URL.createObjectURL(outBlob);
							audioEl.src = objectUrl;
						} else if (json.playSong) {
							audioEl.src = json.playSong;
						}

						try {
							await audioEl.play();
						} catch (error) {
							console.error('Error playing audio:', error);
						}

						audioEl.onended = () => {
							if (objectUrl) {
								URL.revokeObjectURL(objectUrl);
								objectUrl = null;
							}
						};
					} else {
						console.error('Server error:', json.message);
					}
				} catch (error) {
					console.error('Upload or playback failed:', error);
				}
			};

			mediaRecorder.start();
			isActive = true;
		} catch (err) {
			console.error('Microphone error:', err);
			mediaStream?.getTracks().forEach((t) => t.stop());
			mediaStream = null;
			mediaRecorder = null;
			isActive = false;
		}
	}

	function stopRecording() {
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
		} else {
			isActive = false;
			mediaStream?.getTracks().forEach((t) => t.stop());
			mediaStream = null;
			mediaRecorder = null;
		}
	}

	function handlePressStart() {
		startRecording();
	}

	function handlePressEnd() {
		stopRecording();
	}

	function onKeyDown(e: KeyboardEvent) {
		if ((e.key === ' ' || e.key === 'Enter') && !isActive) {
			e.preventDefault();
			handlePressStart();
		}
	}

	function onKeyUp(e: KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			handlePressEnd();
		}
	}

	function base64ToUint8Array(base64: string) {
		const binary = atob(base64);
		const len = binary.length;
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	}

	function cleanup() {
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
			objectUrl = null;
		}
		mediaStream?.getTracks().forEach((t) => t.stop());
		mediaStream = null;
		mediaRecorder = null;
	}

	if (typeof window !== 'undefined') {
		window.addEventListener('pagehide', cleanup);
		window.addEventListener('beforeunload', cleanup);
	}
</script>

<div class="page">
	<div class="floating-particles" aria-hidden="true">
		<div class="particle" style="left: 10%"></div>
		<div class="particle" style="left: 20%"></div>
		<div class="particle" style="left: 30%"></div>
		<div class="particle" style="left: 40%"></div>
		<div class="particle" style="left: 50%"></div>
		<div class="particle" style="left: 60%"></div>
		<div class="particle" style="left: 70%"></div>
		<div class="particle" style="left: 80%"></div>
	</div>

	<div class="container">
		<h1 class="title">Voice Assistant</h1>
		<div
			id="voiceButton"
			class="voice-circle {isActive ? 'active' : ''}"
			role="button"
			tabindex="0"
			on:pointerdown={handlePressStart}
			on:pointerup={handlePressEnd}
			on:pointercancel={handlePressEnd}
			on:mouseleave={handlePressEnd}
			on:keydown={onKeyDown}
			on:keyup={onKeyUp}
		>
			<div class="status"></div>
			<div class="microphone">🎤</div>
		</div>
		<p class="subtitle">{isActive ? 'Listening...' : 'Tap to start speaking'}</p>
	</div>
</div>

<style>
	/* Reset (scoped to this page's elements) */
	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	.page {
		font-family:
			'SF Pro Display',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		min-height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		overflow: hidden;
		position: relative;
	}

	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		padding: 2rem;
		position: relative;
		z-index: 1;
	}

	.voice-circle {
		position: relative;
		width: 280px;
		height: 280px;
		border-radius: 50%;
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
		backdrop-filter: blur(20px);
		border: 2px solid rgba(255, 255, 255, 0.2);
		box-shadow:
			0 20px 60px rgba(0, 0, 0, 0.2),
			inset 0 2px 20px rgba(255, 255, 255, 0.1);
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		overflow: hidden;
	}

	.voice-circle::before {
		content: '';
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: conic-gradient(
			from 0deg,
			transparent,
			rgba(255, 255, 255, 0.1),
			transparent,
			rgba(255, 255, 255, 0.1),
			transparent
		);
		animation: rotate 4s linear infinite;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.voice-circle:hover::before {
		opacity: 1;
	}

	.voice-circle:hover {
		transform: scale(1.05);
		box-shadow:
			0 30px 80px rgba(0, 0, 0, 0.3),
			inset 0 2px 30px rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
	}

	/* Extra hover tint when not active, to match original JS hover effect */
	.voice-circle:not(.active):hover {
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08));
	}

	.voice-circle:active {
		transform: scale(0.98);
		transition: transform 0.1s ease;
	}

	/* Active state matches original JS "activation" colors */
	.voice-circle.active {
		background: linear-gradient(145deg, rgba(255, 100, 100, 0.2), rgba(255, 50, 50, 0.1));
		border-color: rgba(255, 100, 100, 0.4);
	}

	.microphone {
		font-size: 6rem;
		color: rgba(255, 255, 255, 0.9);
		text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		z-index: 2;
		position: relative;
		animation: pulse 2s ease-in-out infinite;
	}

	.title {
		color: rgba(255, 255, 255, 0.95);
		font-size: 2.5rem;
		font-weight: 300;
		text-align: center;
		margin-bottom: 0.5rem;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
		letter-spacing: -0.02em;
	}

	.subtitle {
		color: rgba(255, 255, 255, 0.7);
		font-size: 1.1rem;
		text-align: center;
		font-weight: 400;
		text-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
	}

	.status {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 320px;
		height: 320px;
		border-radius: 50%;
		border: 3px solid rgba(255, 255, 255, 0.3);
		opacity: 0;
		animation: ripple 2s ease-out infinite;
		pointer-events: none;
	}

	.floating-particles {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.particle {
		position: absolute;
		top: 0;
		width: 4px;
		height: 4px;
		background: rgba(255, 255, 255, 0.6);
		border-radius: 50%;
		animation: float 8s ease-in-out infinite;
	}

	.particle:nth-child(1) {
		animation-delay: 0s;
	}
	.particle:nth-child(2) {
		animation-delay: 1s;
	}
	.particle:nth-child(3) {
		animation-delay: 2s;
	}
	.particle:nth-child(4) {
		animation-delay: 3s;
	}
	.particle:nth-child(5) {
		animation-delay: 4s;
	}
	.particle:nth-child(6) {
		animation-delay: 5s;
	}
	.particle:nth-child(7) {
		animation-delay: 6s;
	}
	.particle:nth-child(8) {
		animation-delay: 7s;
	}

	@keyframes rotate {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.9;
		}
		50% {
			transform: scale(1.05);
			opacity: 1;
		}
	}

	@keyframes ripple {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.8);
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(1.2);
		}
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(100vh) rotate(0deg);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			transform: translateY(-10vh) rotate(360deg);
			opacity: 0;
		}
	}

	@media (max-width: 768px) {
		.voice-circle {
			width: 220px;
			height: 220px;
		}

		.microphone {
			font-size: 4.5rem;
		}

		.title {
			font-size: 2rem;
		}

		.subtitle {
			font-size: 1rem;
		}
	}
</style>
