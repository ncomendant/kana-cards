/*!
 * @author Nicholas Comendant
 */

class DataValidator {
    /**
     * Creates new DataValidator. Invalidates test if child does not exist.
     * @constructor
     * @param {*} validatee - The object or primitive being validated.
     * @param {boolean} [handleMultipleErrors=false] - Should multiple tests fail, invoke all applicable onFail handlers if true, othwerise only the onFail handler will be invoked.
     */
    constructor(validatee, handleMultipleErrors = false) {
        this._value = validatee;
        this._handleMultipleErrors = handleMultipleErrors;
        this._parent = arguments[2] || null;

        this._type = this._getType(validatee);
        this._valid = true;
        this._not = false;
    }

    //Public methods

    /**
     * Creates new DataValidator for a child of the validatee. Invalidates test if child does not exist.
     * @param {string|number} name - Key for property in object, or index for element in array
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    prop(name, onFail, ...failArgs) {
        let child = undefined;
        if (this._type === "object" || this._type === "array") child = this._value[name];
        let condition = child !== undefined;
        this._completeCheck(condition, onFail, failArgs);
        return new DataValidator(child, this._handleMultipleErrors, this);
    }

    /**
     * Converts validatee into specified type. New value can be accessed through DataValidator's value property. Invalidates test if unable to convert.
     * @param {string} type  - Type to be converted into. Currently does not support "undefined", "symbol", "function", and "array".
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    convert(type, onFail, failArgs) {
        let unsupportedTypes = ["undefined", "symbol", "function", "array"];
        let oldType = this._type;
        let oldVal = this._value;
        let newVal = null;
        if (type === this._type) return this._completeCheck(true, onFail, failArgs);
        else if (unsupportedTypes.indexOf(type) >= 0) {
            throw new Error("Unsupported datatype: " + type);
        } else if (type === "object") {
            if (oldType === "string") {
                try {
                    newVal = JSON.parse(this._value);
                } catch (error) {
                    newVal = null;
                }
            }
        } else if (type === "boolean") {
            try {
                if (oldVal === "true" || oldVal === 1) newVal == true;
                else if (oldVal === "false" || oldVal === 0) newVal == false;
                //else newVal = !!this._value;
            } catch (error) {
                newVal = null;
            }
        } else if (type === "number") {
            if (oldType === "string") {
                newVal = Number(oldVal.trim());
                if (isNaN(newVal)) newVal = null;
            }
        } else if (type === "string") {
            try {
                if (oldType === "object") newVal = JSON.stringify(oldVal);
                else newVal = oldVal.toString();
            } catch (error) {
                newVal = null;
            }
        } else {
            throw new Error("Unknown datatype: " + type);
        }

        if (newVal !== null) {
            this._value = newVal;
            this._type = this._getType(newVal);
        }
        this._completeCheck(newVal !== null, onFail, failArgs);
        return this;
    }

    /**
     * Checks equality for the validatee and specified value.
     * @param {*} value - The value to check for equality.
     * @param {boolean} [strict=true] - If false, ignore case sensitivity in strings and order in arrays
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    equals(value, strict = true, onFail, failArgs) { //optional argument strict is for case sensitivity in strings and order in arrays
        this._completeCheck(this._equals(this._value, value, strict), onFail, failArgs);
        return this;
    }

    /**
     * Checks length of validatee. Only valid for arrays or strings.
     * @param {number} len - The length of the validatee.
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    length(len, onFail, failArgs) { //for arrays and strings
        if (typeof len !== "number") throw new Error("len must be a number.");
        let condition = false;
        if (this._type === "array" || this._type === "string") {
            condition = len === this._value.length;
        }
        this._completeCheck(condition, onFail, failArgs);
        return this;
    }

    /**
     * Checks if number, or length of string or array, are between the specified values.
     * @param {number} min - The lowest the validatee should be (inclusive).
     * @param {number} max - The highest the validatee should be (inclusive).
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    between(min, max, onFail, failArgs) { //numbers for number, lengths for arrays and strings
        if (typeof min !== "number") throw new Error("min must be a number.");
        if (typeof max !== "number") throw new Error("max must be a number.");
        let condition = false;
        if (this._type === "number") {
            condition = this._value >= min && this._value <= max;
        }
        if (this._type === "array" || this._type === "string") {
            condition = this._value.length >= min && this._value.length <= max;
        }
        this._completeCheck(condition, onFail, failArgs);
        return this;
    }

    /**
     * Checks if number, or length of string or array, are less than the specified value.
     * @param {number} num - The number the validatee should be less than.
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    lessThan(num, onFail, failArgs) {
        if (typeof num !== "number") throw new Error("num must be a number.");
        let condition = false;
        if (this._type === "number") {
            condition = this._value < num;
        }
        if (this._type === "array" || this._type === "string") {
            condition = this._value.length < num;
        }
        this._completeCheck(condition, onFail, failArgs);
        return this;
    }

    /**
     * Checks if number, or length of string or array, are more than the specified value.
     * @param {number} num - The number the validatee should be more than.
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    greaterThan(num, onFail, failArgs) { //number for number, length for arrays and strings
        if (typeof num !== "number") throw new Error("num must be a number.");
        let condition = false;
        if (this._type === "number") {
            condition = this._value > num;
        }
        if (this._type === "array" || this._type === "string") {
            condition = this._value.length > num;
        }
        this._completeCheck(condition, onFail, failArgs);
        return this;
    }

    /**
     * Checks if validatee is of specified type(s).
     * @param {string|string[]} type - Type or array of types validatee should be. If array, test will pass if any type is applicable to validatee.
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    isType(types, onFail, failArgs) { //array of types can be provided (e.g. ["null","string"]), returning true if any match;
        if (this._getType(types) !== "array") types = [types];
        if (this._getType(types[0]) != "string") throw new Error("types must be a string or array of strings.");
        let condition = types.indexOf(this._type) >= 0;
        this._completeCheck(condition, onFail, failArgs);
        return this;
    }

    /**
     * Invokes specified function with validatee as an argument.
     * @param {function} fn - Function to be invoked. Will receive validatee as argument, and should return boolean for if test passed or failed.
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    passes(fn, onFail, failArgs) {
        if (typeof fn !== "function") throw new Error("fn must be a function.");
        let condition = fn(this._value);
        if (typeof condition !== "boolean") throw new Error("Passed function does not return a boolean value.");
        this._completeCheck(condition, arguments, onFail, failArgs);
        return this;
    }

    /**
     * Invokes specified function on all properties in object or elements in array. Invalidates test if function returns false for any of the properties or elements.
     * @param {function} fn - Function to be invoked. Will receive property of element of validatee as argument, and should return boolean for if test passed or failed.
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    all(fn, onFail, failArgs) {
        if (typeof fn !== "function") throw new Error("fn must be a function.");
        let condition = (this._type === "object" || this._type === "array") ? this._all(this._value, fn) : false;
        this._completeCheck(condition, onFail, failArgs);
    }

    /**
     * Invokes specified function on all properties in object or elements in array. Invalidates test if function returns false for all of the properties or elements.
     * @param {function} fn - Function to be invoked. Will receive property of element of validatee as argument, and should return boolean for if test passed or failed.
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    any(fn, onFail, failArgs) {
        if (typeof fn !== "function") throw new Error("fn must be a function.");
        let condition = (this._type === "object" || this._type === "array") ? this._any(this._value, fn) : false;
        this._completeCheck(condition, onFail, failArgs);
    }

    /**
     * Checks if validatee matches specified regular expression.
     * @param {string} exp - The regular expression used to check the validatee.
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    regex(exp, onFail, failArgs) {
        let condition = (this._type === "string") ?exp.test(this.value.toString()) : false;
        this._completeCheck(condition, onFail, failArgs);
        return this;
    }

    /**
     * Checks if validatee contains the following items as properties or elements. Valid only for arrays or objects.
     * @param {*|*[]} items - The items to be checked.
     * @param {string|string[]} [types=null] - The types the properties should be. If array, length must equal items's array length.
     * @param {function|string} [onFail] - Function to be called or string to be reported in console should test fail.
     * @param {...*} [failArgs] - Arguments to be passed to failHandler should test fail.
     */
    contains(items, types = null, onFail, failArgs) { //works with objects, arrays, and strings
        if (!Array.isArray(items)) items = [items];
        let condition = true;
        if (this._type === "object") {
            if (types !== null) {
                if (!Array.isArray(types)) types = [types];
                if (items.length !== types.length) throw new Error("Number of items and types must be the same");
                if (!this._all(types, (x) => {return typeof x === "string";})) throw new Error("Types must be written as strings.");
                for (let i = 0; i < items.length; i++) {
                    let key = items[i];
                    let type = types[i];
                    let value = this._value[key];
                    if (this._getType(value) !== type) {
                        condition = false;
                        break;
                    }
                }
            } else {
                for (let key of items) {
                    if (this._value[key] === undefined) {
                        condition = false;
                        break;
                    }
                }
            }
        } else if (this._type === "string" || this._type === "array") {
            for (let key of items) {
                let found = false;
                for (let valueItem of this._value) {
                    if (this._equals(key, valueItem, true)) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    condition = false;
                    break;
                }
            }
        } else {
            condition = false;
        }
        this._completeCheck(condition, onFail, failArgs);
        return this;
    }

    /**
     * Sets next test to have the opposite result (i.e. a passed test will invalidate, and a failed test will validate).
     */

    get not() {
        if (this._not) throw new Error("'not' already active.");
        this._not = true;
        return this;
    }

    /**
     * Access validatee's parent DataValidator.
     */
    get parent() {
        if (this._parent !== null) {
            if (!this._valid) this._parent._invalidate();
            return this._parent;
        } else {
            throw new Error("Parent not found.");
        }
    }

    get value() {
        if (this._parent !== null) throw new Error("'value' property must be called on the top parent.");
        if (this._not) throw new Error("Cannot access 'value' property with 'not' active.");
        return this._value;
    }

    get valid() {
        if (this._parent !== null) throw new Error("'valid' property must be called on the top parent.");
        if (this._not) throw new Error("Cannot access 'valid' property with 'not' active.");
        return this._valid;
    }

    //Private methods

    /**
     * Invalidates DataValidation for validatee.
     */
    _invalidate() {
        this._valid = false;
    }

    /**
     * Each element or property of the object is passed into the function. Returns true if the specified function returns true for all children or properties.
     * @param {*} obj 
     * @param {function} fn 
     */
    _all(obj, fn) {
        if (Array.isArray(obj)) {
            for (let element of obj) {
                let valid = fn(element);
                if (typeof valid !== "boolean") throw new error("Provided function must return a boolean value.");
                if (!valid) return false;
            }
            return true;
        } else if (typeof obj === "object") {
            for (let key in obj) {
                if (obj.hasOwnPropery(key)) {
                    let valid = fn(obj[key]);
                    if (typeof valid !== "boolean") throw new error("Provided function must return a boolean value.");
                    if (!valid) return false;
                }
            }
            return true;
        } else {
            throw new Error("obj must be an array or object");
        }
    }

    /**
     * Each element or property of the object is passed into the function. Returns true if the specified function returns true for any child or property.
     * @param {*} obj 
     * @param {function} fn 
     */
    _any(obj, fn) {
        if (Array.isArray(obj)) {
            for (let element of obj) {
                let valid = fn(element);
                if (typeof valid !== "boolean") throw new error("Provided function must return a boolean value.");
                if (valid) return true;
            }
            return false;
        } else if (typeof obj === "object") {
            for (let key in obj) {
                if (obj.hasOwnPropery(key)) {
                    let valid = fn(obj[key]);
                    if (typeof valid !== "boolean") throw new error("Provided function must return a boolean value.");
                    if (valid) return true;
                }
            }
            return false;
        } else {
            throw new Error("obj must be an array or object");
        }
    }

    /**
     * Returns type of specified value.
     * @param {*} value 
     */
    _getType(value) {
        if (value === null) return "null";
        else if (Array.isArray(value)) return "array";
        else return typeof value;
    }

    /**
     * Logs result of test and handles failed test (e.g. calls provided onFail function, notify in console, etc.)
     * @param {boolean} condition - Result of test.
     * @param {function|string} onFail - Function to be called or string to be reported in console should test fail.
     * @param {...*} failArgs - Arguments to be passed to failHandler should test fail.
     */
    _completeCheck(condition, onFail, failArgs) {
        if ((this._valid || this._handleMultipleErrors) && (condition === this._not)) { // if condition needed to be checked and did not pass
            this._valid = false;
            if (onFail != null) {
                let onFailType = typeof onFail;
                if (onFailType === "function") {
                    if (!Array.isArray(failArgs)) failArgs = [failArgs];
                    onFail.apply(null, failArgs);
                }
                else if (onFailType === "string") {
                    console.warn(onFail);  
                } else {
                    throw new Error("Invalid catch handler. Only functions and strings are supported.");
                }
            }
        }
        this._not = false;
        return this;
    }

    /**
     * Checks equality, returning a boolean for whether the two values are equal.
     * @param {*} a - The first value.
     * @param {*} b - The second value.
     * @param {boolean} [strict=true] - If false, ignore case sensitivity in strings and order in arrays
     */
    _equals(a, b, strict) { //strict is case sensitive for strings, ordering for arrays
        let aType = this._getType(a);
        let bType = this._getType(b);
        if (aType !== bType) return false;
        if (aType === "array") {
            if (a.length !== b.length) return false;
            let arr1 = (strict) ? a : a.slice(0).sort(); //if not strict, compare a cloned and sorted array
            let arr2 = (strict) ? b : b.slice(0).sort(); //if not strict, compare a cloned and sorted array
            for (let i = 0; i < a.length; i++) {
                if (!this._equals(arr1[i], arr2[i], strict)) return false;
            }
            return true;
        } else if (aType === "object") {
            for (let key in a) {
                if (a.hasOwnPropery(key) && a[key] !== b[key]) return false;
            }
            //iterate through b's properties in case it has more than a
            for (let key in b) {
                if (b.hasOwnPropery(key) && b[key] !== a[key]) return false;
            }
            return true;
        } else if (aType === "string" && !strict) { //not case sensitive
            return a.toUpperCase() === b.toUpperCase();
        } else {
            return a === b;
        }
    }
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') module.exports = DataValidator;
else window.DataValidator = DataValidator;