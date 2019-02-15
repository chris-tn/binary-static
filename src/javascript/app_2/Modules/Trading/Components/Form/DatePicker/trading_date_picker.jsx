import PropTypes                      from 'prop-types';
import { PropTypes as MobxPropTypes } from 'mobx-react';
import React                          from 'react';
import { connect }                    from 'Stores/connect';
import { hasIntradayDurationUnit }    from 'Stores/Modules/Trading/Helpers/duration';
import {
    isTimeValid,
    setTime,
    toMoment }                        from 'Utils/Date';
import DatePicker                     from 'App/Components/Form/DatePicker';

const TradingDatePicker = ({
    mode,
    name,
    server_time,
    expiry_date,
    duration_min_max,
    duration_units_list,
    start_time,
    start_date,
    expiry_type,
    onChange,
    symbol,
    is_24_hours_contract,
}) => {
    let max_date_duration,
        min_date_expiry;
    const is_read_only = expiry_type === 'endtime';
    const moment_contract_start_date_time =
        setTime(toMoment(start_date || server_time), (isTimeValid(start_time) ? start_time : server_time.format('HH:mm')));

    const max_daily_duration = duration_min_max.daily ? duration_min_max.daily.max : 365 * 24 * 3600;
    const has_intraday_duration_unit = hasIntradayDurationUnit(duration_units_list);

    if (is_24_hours_contract) {
        min_date_expiry = moment_contract_start_date_time.clone().startOf('day');
        max_date_duration = moment_contract_start_date_time.clone().add(
            start_date ? 24 * 3600 : (max_daily_duration), 'second');
    } else {
        min_date_expiry = moment_contract_start_date_time.clone().startOf('day');
        max_date_duration = moment_contract_start_date_time.clone().add(max_daily_duration, 'second');

        if (!has_intraday_duration_unit) {
            min_date_expiry.add(1, 'day');
        }
    }

    return (
        <DatePicker
            alignment='left'
            disable_year_selector
            disable_trading_events
            has_today_btn
            is_nativepicker={false}
            is_read_only={is_read_only}
            label={duration_units_list.length === 1 ? duration_units_list[0].text : null}
            mode={mode}
            name={name}
            onChange={onChange}
            min_date={min_date_expiry}
            max_date={max_date_duration}
            start_date={start_date}
            underlying={symbol}
            value={expiry_date}
        />
    );
};

TradingDatePicker.propTypes = {
    duration_min_max   : PropTypes.object,
    duration_units_list: MobxPropTypes.arrayOrObservableArray,
    expiry_date        : PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
    expiry_type         : PropTypes.string,
    is_24_hours_contract: PropTypes.bool,
    mode                : PropTypes.string,
    name                : PropTypes.string,
    onChange            : PropTypes.func,
    server_time         : PropTypes.object,
    start_date          : PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
    ]),
    start_time: PropTypes.string,
    symbol    : PropTypes.string,
};

export default connect(
    ({ modules, common }) => ({
        expiry_date        : modules.trade.expiry_date,
        duration_min_max   : modules.trade.duration_min_max,
        duration_units_list: modules.trade.duration_units_list,
        start_time         : modules.trade.start_time,
        start_date         : modules.trade.start_date,
        expiry_type        : modules.trade.expiry_type,
        onChange           : modules.trade.onChange,
        symbol             : modules.trade.symbol,
        server_time        : common.server_time,
    })
)(TradingDatePicker);
