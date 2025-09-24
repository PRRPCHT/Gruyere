<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import gruyere from '$lib/assets/gruyere_256px.webp';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<div class="mx-auto navbar max-w-6xl bg-base-100 shadow-sm">
	<div class="flex-none">
		<label for="my-drawer-2" class="drawer-button btn btn-ghost lg:hidden"
			><svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				class="inline-block h-5 w-5 stroke-current"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				></path>
			</svg>
		</label>
		<!-- <button class="btn btn-square btn-ghost">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-5 w-5 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						></path>
					</svg>
				</button> -->
	</div>
	<div class="flex flex-1 flex-row gap-0">
		<a class="mx-1 flex flex-row gap-4 text-left text-xl" href="/">
			<img src={gruyere} alt="Gruyere" width={64} height={64} />
			<div class="flex h-[64px] flex-col items-start justify-center">
				<div class="text-2xl">Gruyère</div>
				<div class="text-sm text-gray-500">Because gruyère is full of holes.</div>
			</div>
		</a>
	</div>
	<div class="flex-none">
		<button class="btn btn-square btn-ghost">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				class="inline-block h-5 w-5 stroke-current"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
				></path>
			</svg>
		</button>
	</div>
</div>
<main class="mx-auto max-w-6xl p-6">
	{@render children?.()}
</main>
