<script lang="ts">
	import type { ActionStatus } from '$lib/types/types';
	let { status }: { status: ActionStatus } = $props();
</script>

<div class="alert alert-{status.success ? 'success' : 'error'}">
	<span>{status.instance} - {status.message}</span>
</div>
