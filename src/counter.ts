export class ResultCounter {
    _maxResults: number;
    _actualResults = 0;
    _plannedItems = 0;

    constructor(maximalResults: number) {
        this._maxResults = maximalResults;
    }

    increment() {
        this._actualResults += 1;
    }

    reachedMax() {
        return this._actualResults >= this._maxResults;
    }

    plannedIsUnderLimit() {
        return this._plannedItems + this._actualResults <= this._maxResults;
    }

    addPlannedItems(amount: number) {
        this._plannedItems += amount;
    }
}
