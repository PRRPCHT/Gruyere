<script lang="ts">
	import StatItem from './StatItem.svelte';
	import { PiHoleInstanceStatus, type ClientPiHoleInstance, type Stats } from '$lib/types/types';
	import { enhance } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import ErrorMessage from './Error.svelte';
	import { onDestroy, onMount } from 'svelte';

	let {
		instance,
		piHoleInstances
	}: { instance: ClientPiHoleInstance; piHoleInstances: ClientPiHoleInstance[] } = $props();

	let stats = $state<Stats | null>(null);
	let instanceStatus = $state<PiHoleInstanceStatus>(instance.status);
	let isRefreshing = $state(true);
	let refreshInterval: NodeJS.Timeout | null = $state(null);

	let showEditInstancePanel = $state(false);
	let editInstanceName = $state(instance.name);
	let editInstanceUrl = $state(instance.url);
	let editInstanceApiKey = $state('');
	let editIsReference = $state(instance.isReference);
	let editInstanceId = $state(instance.id);
	let form = $state<Record<string, unknown>>({});

	function showEditModal() {
		form = {};
		showEditInstancePanel = true;
	}

	function refreshStats() {
		isRefreshing = true;

		fetch(`/api/getStats?instance=${instance.id}`)
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return await res.json();
			})
			.then((json) => {
				stats = json.stats;
				instanceStatus = json.instanceStatus;
			})
			.catch((err) => {
				console.error('Fetch error:', err);
			})
			.finally(() => {
				isRefreshing = false;
			});
	}

	function formatPercentage(percentage: number | undefined) {
		if (!percentage) return '-';
		return percentage.toFixed(2) + '%';
	}

	function startPolling() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}

		refreshInterval = setInterval(() => {
			refreshStats();
		}, 10000);
	}

	function stopPolling() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}

	onMount(() => {
		refreshStats();
		startPolling();
	});

	onDestroy(() => {
		stopPolling();
	});
</script>

<div class="flex w-full flex-col">
	<div
		class="flex flex-row justify-between p-2"
		class:bg-slate-700={instanceStatus === PiHoleInstanceStatus.ACTIVE}
		class:bg-red-800={instanceStatus !== PiHoleInstanceStatus.ACTIVE}
	>
		<div class="flex flex-row items-center gap-4 py-2">
			<div class="ps-2 text-lg font-bold">{instance.name}</div>
			<div class="text-sm">
				<a
					href={instance.url + '/admin'}
					target="_blank"
					rel="external noopener noreferrer"
					class="link no-underline hover:text-secondary">{instance.url}</a
				>
			</div>
		</div>
		<div class="flex flex-row items-center gap-2">
			{#if isRefreshing}
				<span class="loading loading-md loading-spinner"></span>
			{/if}
			{#if instance.isReference}
				<div class="badge badge-soft badge-success">Reference</div>
			{/if}
			{#if instanceStatus === PiHoleInstanceStatus.ACTIVE}
				<div class="badge badge-soft badge-success">Active</div>
			{:else if instanceStatus === PiHoleInstanceStatus.UNAUTHORIZED}
				<div class="badge badge-soft badge-error">Unauthorized</div>
			{:else if instanceStatus === PiHoleInstanceStatus.UNREACHABLE}
				<div class="badge badge-soft badge-error">Not active</div>
			{:else}
				<div class="badge badge-soft">Refreshing</div>
			{/if}
			<button class="btn btn-ghost btn-sm" onclick={() => showEditModal()}>Edit</button>
		</div>
	</div>
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
		{#if instanceStatus === PiHoleInstanceStatus.ACTIVE}
			<StatItem label="Total queries" value={stats?.queries?.total} backgroundColor="bg-cyan-700" />
			<StatItem
				label="Queries blocked"
				value={stats?.queries?.blocked}
				backgroundColor="bg-red-800"
			/>
			<StatItem
				label="Percentage blocked"
				value={formatPercentage(stats?.queries?.percent_blocked)}
				backgroundColor="bg-yellow-600"
			/>
			<StatItem
				label="Domains on list"
				value={stats?.queries?.unique_domains}
				backgroundColor="bg-emerald-800"
			/>
		{:else}
			<StatItem label="Total queries" value="-" backgroundColor="bg-base-200" />
			<StatItem label="Queries blocked" value="-" backgroundColor="bg-base-200" />
			<StatItem label="Percentage blocked" value="-" backgroundColor="bg-base-200" />
			<StatItem label="Domains on list" value="-" backgroundColor="bg-base-200" />
		{/if}
	</div>
</div>

{#if showEditInstancePanel}
	<dialog id="edit_pihole_instance_modal" class="modal-open modal rounded-none">
		<div class="modal-box flex flex-col gap-4 rounded-none">
			<h3 class="text-lg font-bold">Edit Pi-hole instance</h3>
			<form
				class="flex flex-col gap-2"
				method="post"
				action="?/editPiHoleInstance"
				use:enhance={() => {
					return async ({
						result,
						update
					}: {
						result: ActionResult<
							{ success: boolean; instances: ClientPiHoleInstance[] },
							Record<string, unknown>
						>;
						update: () => Promise<void>;
					}) => {
						await update();
						if (result.type === 'success' && result.data?.success) {
							const updatedInstance = result.data.instances.find((i) => i.id === editInstanceId);
							if (updatedInstance) {
								instance = updatedInstance;
								editInstanceName = updatedInstance.name;
								editInstanceUrl = updatedInstance.url;
								editInstanceApiKey = '';
								editIsReference = updatedInstance.isReference;
							}
							showEditInstancePanel = false;
						} else if (result.type === 'failure') {
							form = result.data ?? {};
						}
					};
				}}
			>
				<input type="hidden" name="id" value={editInstanceId} />
				{#if form?.missingName}
					<ErrorMessage message="The name field is required." />
				{/if}
				{#if form?.missingUrl}
					<ErrorMessage message="The URL field is required." />
				{/if}
				<div class="flex flex-col gap-2" class:text-error={form?.missingName}>
					<label class="label" for="instanceName">Instance name</label>
					<input
						type="text"
						class="input w-full rounded-none"
						bind:value={editInstanceName}
						name="name"
						id="instanceName"
						class:border-error={form?.missingName}
					/>
				</div>
				<div class="flex flex-col gap-2" class:text-error={form?.missingUrl}>
					<label class="label" for="instanceUrl">Instance URL</label>
					<input
						type="text"
						class="input w-full rounded-none"
						bind:value={editInstanceUrl}
						name="url"
						id="instanceUrl"
						class:border-error={form?.missingUrl}
					/>
				</div>
				<div class="flex flex-col gap-2">
					<label class="label" for="instanceApiKey">API Key</label>
					<input
						type="password"
						class="input w-full rounded-none"
						bind:value={editInstanceApiKey}
						name="apiKey"
						id="instanceApiKey"
						placeholder="Leave empty to keep current key"
					/>
				</div>
				{#if piHoleInstances.length > 1}
					<div class="flex flex-col gap-2">
						<label class="label" for="isReference">Is Reference</label>
						<select
							class="select w-full rounded-none"
							bind:value={editIsReference}
							name="isReference"
							id="isReference"
						>
							<option value={true}>True</option>
							<option value={false}>False</option>
						</select>
					</div>
				{:else}
					<input type="hidden" name="isReference" bind:value={editIsReference} />
				{/if}
				<div class="mt-3 flex w-full flex-row justify-between">
					<div>
						<button
							class="btn rounded-none btn-ghost"
							onclick={() => (showEditInstancePanel = false)}>Cancel</button
						>
						<button class="btn rounded-none btn-error" formaction="?/deletePiHoleInstance"
							>Delete</button
						>
					</div>

					<button class="btn rounded-none bg-slate-700 hover:bg-slate-600" type="submit">
						Save
					</button>
				</div>
			</form>
		</div>
	</dialog>
{/if}
