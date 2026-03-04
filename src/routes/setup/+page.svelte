<script lang="ts">
	import Error from '$lib/components/Error.svelte';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	let { form }: PageProps = $props();
	let isLoading = $state(false);
</script>

<section class="mx-auto flex flex-col gap-4">
	<h1 class="mx-auto max-w-lg text-2xl">Set up Gruyere</h1>
	<p class="mx-auto max-w-lg text-sm opacity-70">
		No password has been configured yet. Set one to get started.
	</p>
	<form
		class="mx-auto flex max-w-lg flex-col gap-4"
		method="POST"
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
				autocomplete="new-password"
				disabled={isLoading}
				required
			/>
		</div>
		<div class="flex flex-col gap-2">
			<label for="confirm-input" class="label">Confirm password</label>
			<input
				id="confirm-input"
				name="confirm"
				type="password"
				class="input w-full"
				autocomplete="new-password"
				disabled={isLoading}
				required
			/>
		</div>
		<button class="btn btn-primary" disabled={isLoading}>
			{#if isLoading}
				<span class="loading loading-sm loading-spinner"></span>
			{/if}
			Set password
		</button>
	</form>
</section>
