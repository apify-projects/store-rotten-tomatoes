export class ResultCounter {
    _maxResults: number;
    _actualResults = 0;

    constructor(maximalResults: number) {
        this._maxResults = maximalResults;
    }

    increment() {
        this._actualResults += 1;
    }

    isUnderLimit(amount: number) {
        return this._actualResults + amount <= this._maxResults;
    }

    reachedMax() {
        return this._actualResults >= this._maxResults;
    }
}
