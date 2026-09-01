function applyBooleanFilters(data, filters) {
  return filters.reduce((result, filterSpec) => {
    const { key, value } = filterSpec;

    if (value === undefined) {
      return result;
    }

    return result.filter((item) => item[key] === (value === "true"));
  }, data);
}

module.exports = {
  applyBooleanFilters,
};
