// ---------------------------------
// getLineNumber.js - getLineNumber function
// ---------------------------------

const getLineNumber = () => {
    const obj = {};
    Error.captureStackTrace(obj, getLineNumber);
    const stack = obj.stack.split("\n")[1];
    const match = stack.match(/:(\d+):\d+\)?$/);
    return match ? match[1] : null;
};

module.exports = { getLineNumber }