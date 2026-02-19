export class SimulatedTradingClient {
    initialUsdc: number;
    cashUsdc: number;
    positionsByTokenId: Record<string, number>;

    constructor(initialUsdc: number) {
        this.initialUsdc = Number.isFinite(Number(initialUsdc)) ? Number(initialUsdc) : 1000;
        this.cashUsdc = this.initialUsdc;
        this.positionsByTokenId = {};
    }
}

