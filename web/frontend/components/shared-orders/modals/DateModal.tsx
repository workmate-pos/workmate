import { useState } from 'react';
import { DatePicker, Modal } from '@shopify/polaris';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';

export function DateModal({
  open,
  onClose,
  onUpdate,
  timezone,
  initialDate = new Date(),
}: {
  open: boolean;
  onClose: () => void;
  onUpdate: (date: Date) => void;
  /**
   * If false, the returned date will be timezone free, i.e. in UTC.
   * If true, the local timezone is used.
   */
  timezone?: boolean;
  /**
   * The date the date picker should focus on initially.
   * Defaults to now.
   */
  initialDate?: Date;
}) {
  const [datePickerMonth, setDatePickerMonth] = useState(initialDate.getMonth());
  const [datePickerYear, setDatePickerYear] = useState(initialDate.getFullYear());

  return (
    <Modal open={open} title={'Select date'} onClose={onClose} sectioned>
      <DatePicker
        month={datePickerMonth}
        year={datePickerYear}
        onMonthChange={(month, year) => {
          setDatePickerMonth(month);
          setDatePickerYear(year);
        }}
        onChange={({ start: date }) => {
          if (timezone) {
            onUpdate(date);
          } else {
            const dateUtc = new Date(date.getTime() - date.getTimezoneOffset() * MINUTE_IN_MS);
            onUpdate(dateUtc);
          }
          onClose();
        }}
      />
    </Modal>
  );
}
