import classNames      from 'classnames';
import React           from 'react';
import {
    IconArrow,
    IconCalendar,
    IconClear }        from 'Assets/Common';
import {
    daysFromTodayTo,
    formatDate,
    isDateValid,
    toMoment }         from 'Utils/Date';
import DatePickerInput from './date_picker_input.jsx';
import Calendar        from '../../Elements/Calendar';

class DatePicker extends React.PureComponent {
    state = {
        value                : '',
        is_datepicker_visible: false,
        is_clear_btn_visible : false,
    };

    componentDidMount() {
        document.addEventListener('click', this.onClickOutside, true);
        const { value, mode } = this.props;
        this.updateDatePickerValue(value, mode);
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.onClickOutside, true);
    }

    handleVisibility = () => {
        this.setState({ is_datepicker_visible: !this.state.is_datepicker_visible });
    }

    onClickOutside = (e) => {
        if (!this.mainNode.contains(e.target) && this.state.is_datepicker_visible) {
            this.setState({ is_datepicker_visible: false });
            if (!!this.state.value && this.props.mode !== 'duration') {
                this.updateDatePickerValue(formatDate(this.state.value));
            }
        }
    }

    onMouseEnter = () => {
        if (this.state.value && (!('is_clearable' in this.props) || this.props.is_clearable)) {
            this.setState({ is_clear_btn_visible: true });
        }
    }

    onMouseLeave = () => {
        this.setState({ is_clear_btn_visible: false });
    }

    onSelectCalendar = (selected_date, is_datepicker_visible) => {
        let value = selected_date;
        if (!isDateValid(value)) { value = ''; }

        if (this.props.mode === 'duration') {
            this.updateDatePickerValue(daysFromTodayTo(value), 'duration');
        } else {
            this.updateDatePickerValue(value);
        }
        this.setState({ is_datepicker_visible });
    }

    onChangeInput = (e) => {
        const value = e.target.value;
        this.updateDatePickerValue(value, this.props.mode);
    }

    clearDatePickerInput = () => {
        this.setState({ value: '' }, this.updateStore);
        this.calendar.resetCalendar();
    };

    // TODO: handle cases where user inputs date before min_date and date after max_date
    updateDatePickerValue = (value, mode) => {
        this.setState({ value }, this.updateStore);

        // update Calendar
        const { date_format, start_date } = this.props;
        const new_date = (mode === 'duration') ? toMoment().add(value, 'days').format(date_format) : value;
        if (this.calendar && (isDateValid(new_date) || !new_date)) {
            if (!new_date) {
                const current_date = toMoment(start_date).format(date_format);
                this.calendar.setState({
                    calendar_date: current_date,
                    selected_date: current_date,
                });
            } else {
                this.calendar.setState({
                    calendar_date: formatDate(new_date),
                    selected_date: formatDate(new_date),
                });
            }
        }
    }

    // update MobX store
    updateStore = () => {
        const { name, onChange } = this.props;
        if (onChange) {
            onChange({ target: { name, value: this.state.value } });
        }
    };

    render() {
        if (this.props.is_nativepicker) {
            return (
                <div ref={node => { this.mainNode = node; }} className='datepicker'>
                    <input
                        id={this.props.name}
                        name={this.props.name}
                        className='datepicker__input'
                        type='date'
                        value={this.state.value}
                        min={this.props.min_date}
                        max={this.props.max_date}
                        onChange={(e) => {
                            // fix for ios issue: clear button doesn't work
                            // https://github.com/facebook/react/issues/8938
                            const target = e.nativeEvent.target;
                            function iosClearDefault() { target.defaultValue = ''; }
                            window.setTimeout(iosClearDefault, 0);

                            this.onSelectCalendar(e.target.value);
                        }}
                    />
                    <label className='datepicker__native-overlay' htmlFor={this.props.name}>
                        {this.state.value || this.props.placeholder}
                        <IconArrow className='datepicker__native-overlay__arrowhead' />
                    </label>
                </div>
            );
        }

        return (
            <div
                id={this.props.id || undefined}
                ref={node => { this.mainNode = node; }}
                className='datepicker'
                onMouseEnter={this.onMouseEnter}
                onMouseLeave={this.onMouseLeave}
                data-value={this.state.value || undefined}
                name={this.props.name}
            >
                <DatePickerInput
                    class_name='datepicker__input'
                    mode={this.props.mode}
                    name={this.props.name}
                    placeholder={this.props.placeholder}
                    onClick={this.handleVisibility}
                    is_read_only={true}
                    value={this.state.value}
                />
                <IconCalendar className='datepicker__input__icon datepicker__input__icon--calendar' />
                <IconClear
                    className={classNames('datepicker__input__icon datepicker__input__icon--clear', {
                        'datepicker__input__icon--is-hidden': !this.state.is_clear_btn_visible,
                    })}
                    onClick={this.clearDatePickerInput}
                />
                <div
                    className={classNames('datepicker__picker', {
                        'datepicker__picker--show'                           : this.state.is_datepicker_visible,
                        [`datepicker__picker--align-${this.props.alignment}`]: this.props.alignment,
                    })}
                >
                    <Calendar
                        ref={node => { this.calendar = node; }}
                        onSelect={this.onSelectCalendar}
                        {...this.props}
                    >
                        <DatePickerInput
                            class_name='calendar__input'
                            mode={this.props.mode}
                            name={this.props.name}
                            onChange={this.onChangeInput}
                            placeholder={this.props.placeholder}
                            is_read_only={'is_read_only' in this.props ? this.props.is_read_only : false}
                            value={this.state.value}
                        />
                    </Calendar>
                </div>
            </div>
        );
    }
}

DatePicker.defaultProps = {
    date_format: Calendar.defaultProps.date_format,
    mode       : 'date',
};

DatePicker.propTypes = {
    ...DatePickerInput.propTypes,
    ...Calendar.propTypes,
};

export default DatePicker;
