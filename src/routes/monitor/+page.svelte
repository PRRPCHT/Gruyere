<script lang="ts">
	import type { PageProps } from './$types';
	import { type PiHoleInstance } from '$lib/types/types';
	import InstanceStats from '$lib/components/InstanceStats.svelte';

	let { data }: PageProps = $props();
	let instances: PiHoleInstance[] = $state(data.instances);
</script>

<section class="flex flex-col">
	<div class="header flex flex-row justify-between p-2">
		<div class="flex flex-row items-center gap-4 py-2">
			<div class="ps-2 text-lg font-bold">Pi-hole instances</div>
		</div>
	</div>
	<div class="flex flex-col flex-wrap gap-6">
		{#each instances as instance}
			<InstanceStats {instance} />
		{/each}
	</div>
</section>
