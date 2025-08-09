<script lang="ts">
	import { onDestroy } from 'svelte';

	let isActive = false;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	function handleClick() {
		if (!isActive) {
			isActive = true;
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				isActive = false;
				timeoutId = null;
			}, 3000);
		}
	}

	onDestroy(() => {
		if (timeoutId) clearTimeout(timeoutId);
	});
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
			on:click={handleClick}
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
