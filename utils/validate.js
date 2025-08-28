module.exports = function validateFields(fields) {
    const errors = []
    for (const [, [value, msg]] of Object.entries(fields)) {
        if (typeof value === 'string' && value.trim() === '') {
            errors.push(msg)
        }
        if (value === undefined || value === null) {
            errors.push(msg)
        }
    }
    return errors
}