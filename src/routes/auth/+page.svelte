<script lang="ts">
	import Error from '$lib/components/Error.svelte';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	let password = $state('');
	let isLoading = $state(false);
</script>

<section class="mx-auto flex flex-col gap-4">
	<h1 class="mx-auto max-w-lg text-2xl">Log in</h1>
	<form 
		class="mx-auto flex max-w-lg flex-col gap-4" 
		method="POST" 
		action="?/login"
		use:enhance={() => {
			isLoading = true;
			return async ({ update }) => {
				await update();
				isLoading = false;
			};
		}}
	>
		{#if form?.error}
			<Error message={form.error} />
		{/if}
		<div class="flex flex-col gap-2">
			<label for="password-input" class="label">Password</label>
			<input
				id="password-input"
				name="password"
				type="password"
				class="input w-full"
				bind:value={password}
				disabled={isLoading}
				required
			/>
		</div>

		<button class="btn btn-primary" disabled={isLoading}>
			{#if isLoading}
				<span class="loading loading-sm loading-spinner"></span>
			{/if}
			Log in
		</button>
	</form>
</section>
