'use strict';
const _ = require('lodash');
const moment = require('moment');
const momentTz = require('moment-timezone');
const Utils = require('./utilities');

module.exports = BaseTypes => {
    const warn = BaseTypes.ABSTRACT.warn.bind(undefined, 'https://docs.oracle.com/database/122/SQLRF/Data-Types.htm#SQLRF30020');
    BaseTypes.DATE.types.oracle = ['TIMESTAMP', 'TIMESTAMP WITH LOCAL TIME ZONE'];
    BaseTypes.STRING.types.oracle = ['VARCHAR2', 'NVARCHAR2'];
    BaseTypes.CHAR.types.oracle = ['CHAR', 'RAW'];
    BaseTypes.TEXT.types.oracle = ['CLOB'];
    BaseTypes.INTEGER.types.oracle = ['INTEGER'];
    BaseTypes.BIGINT.types.oracle = false;
    BaseTypes.FLOAT.types.oracle = false;
    BaseTypes.TIME.types.oracle = ['DATE','TIMESTAMP'];
    BaseTypes.DATEONLY.types.oracle = ['DATE', 'DATEONLY'];
    BaseTypes.BOOLEAN.types.oracle = ['NUMBER'];
    BaseTypes.BLOB.types.oracle = ['BLOB'];
    BaseTypes.DECIMAL.types.oracle = ['DECIMAL'];
    BaseTypes.UUID.types.oracle = false;
    BaseTypes.ENUM.types.oracle = false;
    BaseTypes.REAL.types.oracle = false;
    BaseTypes.NUMERIC.types.oracle = false;
    BaseTypes.DOUBLE.types.oracle = false;
    BaseTypes.GEOMETRY.types.oracle = false;
    BaseTypes.JSON.types.oracle = ['CLOB']

    class STRING extends BaseTypes.STRING {
        toSql() {
            if (this.length > 4000 || (this._binary && this._length > 2000)) {
                warn('Oracle 12 supports length up to 32764; be sure that your administrator has extended the MAX_STRING_SIZE parameter. Check https://docs.oracle.com/database/121/REFRN/GUID-D424D23B-0933-425F-BC69-9C0E6724693C.htm#REFRN10321');
            }
            if (!this._binary) {
                return 'NVARCHAR2(' + this._length + ')';
            }
            else {
                return 'RAW(' + this._length + ')';
            }
        }
        _stringify(value, options) {
            if (this._binary) {
                return BaseTypes.CLOB.prototype._stringify(value);
            }
            else if(value.includes(`'`)){
                return options.escape(value); 
            }
            else {
                return value;
            }
        }
    }
    class BOOLEAN extends BaseTypes.BOOLEAN {
        toSql() {
            return 'SMALLINT';
        }
        _stringify(value) {
            return value ? 1 : 0;
        }
        static parse(value){
            return value==1 ? true: false;
        }
    }
    class UUID extends BaseTypes.UUID {
        toSql() {
            return 'NVARCHAR2(36)';
        }
    }
    class NOW extends BaseTypes.NOW {
        toSql() {
            return 'SELECT TO_CHAR(SYSDATE, \'YYYY-MM-DD HH24:MI:SS\') "NOW" FROM DUAL;';
        }
        _stringify() {
            return 'SELECT TO_CHAR(SYSDATE, \'YYYY-MM-DD HH24:MI:SS\') "NOW" FROM DUAL;';
        }
    }
    class DATE extends BaseTypes.DATE {
        escape = false
        toSql() {
            return 'TIMESTAMP WITH LOCAL TIME ZONE';
        }
        _stringify(date, options) {
            const format = 'YYYY-MM-DD HH24:MI:SS.FFTZH:TZM';
            date = this._applyTimezone(date, options);
            const formatedDate = date.format('YYYY-MM-DD HH:mm:ss.SSS Z');
            return `TO_TIMESTAMP_TZ('${formatedDate}','${format}')`;
        }
        _applyTimezone(date, options) {
            if (options.timezone) {
                if (momentTz.tz.zone(options.timezone)) {
                    date = momentTz(date).tz(options.timezone);
                }
                else {
                    date = moment(date).utcOffset(options.timezone);
                }
            }
            else {
                date = momentTz(date);
            }
            return date;
        }
        static parse(value, options) {
            value = value.toString();
            if (value === null) {
                return value;
            }
            if (options && moment.tz.zone(options.timezone)) {
                value = moment.tz(value, options.timezone).toDate();
            }
            else if (options) {
                value = new Date(`${value} ${options.timezone}`);
            }
            else {
                value = new Date(`${value}`);
            }
            return value;
        }
    }
    class DECIMAL extends BaseTypes.DECIMAL {
        constructor() {
            super();
            this.key = 'DECIMAL';
        }
        toSql() {
            let result = '';
            if (this._length) {
                result += '(' + this._length;
                if (typeof this._decimals === 'number') {
                    result += ',' + this._decimals;
                }
                result += ')';
            }
            if (!this._length && this._precision) {
                result += '(' + this._precision;
                if (typeof this._scale === 'number') {
                    result += ',' + this._scale;
                }
                result += ')';
            }
            return 'NUMBER' + result;
        }
    }
    class BIGINT extends BaseTypes.BIGINT {
        constructor(length) {
            super(length);
            warn('Oracle does not support BIGINT. Plain `NUMBER(19)` will be used instead.');
            if (!(this instanceof BIGINT))
                return new BIGINT(length);
            BaseTypes.BIGINT.apply(this, arguments);
            // ORACLE does not support any options for bigint
            if (this._length || this.options.length || this._unsigned || this._zerofill) {
                this._length = undefined;
                this.options.length = undefined;
                this._unsigned = undefined;
                this._zerofill = undefined;
            }
        }
        toSql() {
            return 'NUMBER(19)';
        }
    }
    class DOUBLE extends BaseTypes.DOUBLE {
        constructor(length, decimals) {
            super(length, decimals);
            if (!(this instanceof DOUBLE))
                return new BaseTypes.DOUBLE(length, decimals);
            BaseTypes.DOUBLE.apply(this, arguments);
            if (this._length || this._unsigned || this._zerofill) {
                this._length = undefined;
                this.options.length = undefined;
                this._unsigned = undefined;
                this._zerofill = undefined;
            }
            this.key = 'DOUBLE PRECISION';
        }
        toSql() {
            return 'NUMBER(15,5)';
        }
    }
    class DATEONLY extends BaseTypes.DATEONLY {
        escape = false
		parse(value) {
            return moment(value).format('YYYY-MM-DD');
        }
        _stringify(date) {
            const format = 'YYYY/MM/DD';
            return `TO_DATE('${date}','${format}')`;
        }
    }

    class JSON extends BaseTypes.JSON {
        toSql() {
          return 'CLOB'
        }

        _stringify(value) {
            console.log(Utils.toString(value));
            return Utils.toString(value);
        }

        static parse(value) {
          return Utils.toJson(value)
        }
    }

    class TIME extends BaseTypes.TIME {
        escape = false;
        toSql() {
            return 'TIMESTAMP';
        }
        _stringify(time, options) {
            const date = "2000-01-01"
            return `TIMESTAMP'${date} ${time}'` ;
        }
        static parse(value, options) {
            value = value.toString();
            console.log(value)
            if (value === null) {
                return 'hola';
            }
            else{
              let time = moment(value).format('HH:mm:ss'); 
              console.log(time)
              return time;
            }
        }
    }

    const exports = {
        JSON,
        BOOLEAN,
        'DOUBLE PRECISION': DOUBLE,
        DOUBLE,
        STRING,
        BIGINT,
        UUID,
        DATEONLY,
        DATE,
        TIME,
        NOW,
        DECIMAL
    };
    _.forIn(exports, (DataType, key) => {
        if (!DataType.key)
            DataType.key = key;
        if (!DataType.extend) {
            DataType.extend = function (oldType) {
                return new DataType(oldType.options);
            };
        }
    });
    return exports;
};
//# sourceMappingURL=data-types.js.map