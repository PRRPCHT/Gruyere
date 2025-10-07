<script lang="ts">
	import StatItem from './StatItem.svelte';
	import { PiHoleInstanceStatus, type PiHoleInstance, type Stats } from '$lib/types/types';
	import { onDestroy, onMount } from 'svelte';

	let { instance }: { instance: PiHoleInstance } = $props();
	let stats = $state<Stats | null>(null);
	let instanceStatus = $state<PiHoleInstanceStatus>(instance.status);
	let isRefreshing = $state(true);
	let error = $state<string | null>(null);
	let refreshInterval: NodeJS.Timeout | null = $state(null);

	function refreshStats() {
		isRefreshing = true;

		// Call our local API
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
				error = 'Failed to load stats.';
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
					class="link no-underline hover:text-secondary">{instance.url}</a
				>
			</div>
		</div>
		<div class="flex flex-row items-center gap-2">
			{#if isRefreshing}
				<span class="loading loading-md loading-spinner"></span>
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
