<script lang="ts">
	import type { ActionStatus } from '$lib/types/types';
	let { status }: { status: ActionStatus } = $props();
</script>

<div class="alert" class:alert-success={status.success} class:alert-error={!status.success}>
	<span>{status.instance} - {status.message}</span>
</div>
