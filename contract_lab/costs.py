"""Offline cost estimation. Prices are a dated assumption, not billing truth."""
from decimal import Decimal


class VoiceUsage:
    """Cumulative usage snapshots must not be added together."""
    def __init__(self):
        self.sessions = {}

    def observe(self, connection, seconds, *, final=False):
        seconds = Decimal(str(seconds))
        if not seconds.is_finite() or seconds < 0:
            raise ValueError('Invalid cumulative seconds')
        previous = self.sessions.get(connection)
        if previous and previous['final']:
            # A late update never overrides a final snapshot.
            return
        if previous and seconds < previous['seconds']:
            if final:
                raise ValueError('Conflicting final usage requires reconciliation')
            return
        self.sessions[connection] = {'seconds':seconds, 'final':final}

    def estimate(self, model_input=0, model_output=0, decision_input=0, *,
                 cache_read=0, cache_write_30m=0, cache_write_12h=0):
        """Sol Standard only; input is total and cache buckets are disjoint subsets."""
        quantities = [Decimal(str(v)) for v in
                      (model_input, model_output, decision_input,
                       cache_read, cache_write_30m, cache_write_12h)]
        if any(not v.is_finite() or v < 0 for v in quantities):
            raise ValueError('Invalid token usage')
        uncached = quantities[0] - sum(quantities[3:])
        if uncached < 0:
            raise ValueError('Cache buckets exceed total input; reconcile provider usage')
        seconds = sum((s['seconds'] for s in self.sessions.values()), Decimal(0))
        voice = seconds * Decimal('0.05') / Decimal(60)
        # A write rate replaces the uncached rate; do not add both for one token.
        text = (uncached * Decimal('2') + quantities[1] * Decimal('10')
                + quantities[3] * Decimal('0.10')
                + quantities[4] * Decimal('2.50')
                + quantities[5] * Decimal('5')) / Decimal(1000000)
        decisions = quantities[2] * Decimal('0.10') / Decimal(1000000)
        return {'voice_usd':str(voice), 'text_usd':str(text), 'decisions_usd':str(decisions),
                'total_usd':str(voice+text+decisions),
                'finalization_confirmed':bool(self.sessions) and all(s['final'] for s in self.sessions.values()),
                'excluded':'non-Sol models, regional or priority uplifts, tools, infrastructure, taxes, human labor; Decisions cache adjustments not modeled',
                'price_date':'2026-10-22'}
