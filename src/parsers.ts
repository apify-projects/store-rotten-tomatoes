export const parseMovieDetailValues = (values: string) => {
    if (values.includes(',') || values.includes('\n')) {
        return values
            .split('\n')
            .map((x) => x.replace(',', '').trim())
            .filter((x) => x != '')
            .join(', ');
    }
    return values;
};
