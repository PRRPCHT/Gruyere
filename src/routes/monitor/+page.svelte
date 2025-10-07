<script lang="ts">
	import type { PageProps } from './$types';
	import { type PiHoleInstance } from '$lib/types/types';
	import InstanceStats from '$lib/components/InstanceStats.svelte';

	let { data }: PageProps = $props();
	let instances: PiHoleInstance[] = $state(data.instances);
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-2xl">Monitor Pi-hole instances</h2>
	<div class="flex flex-row flex-wrap">
		{#each instances as instance}
			<InstanceStats {instance} />
		{/each}
	</div>
</section>
