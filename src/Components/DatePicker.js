import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { setToast } from "@/Store/Slices/Publishers";
import Overlay from "./Overlay";
import Select from "./UI/Select";
import Button from "./UI/Button";

const currentYear = new Date().getFullYear();

const months = [
  { display_name: "January", value: 1 },
  { display_name: "February", value: 2 },
  { display_name: "March", value: 3 },
  { display_name: "April", value: 4 },
  { display_name: "May", value: 5 },
  { display_name: "June", value: 6 },
  { display_name: "July", value: 7 },
  { display_name: "August", value: 8 },
  { display_name: "September", value: 9 },
  { display_name: "October", value: 10 },
  { display_name: "November", value: 11 },
  { display_name: "December", value: 12 },
];

const years = Array.from({ length: 3 }, (_, i) => ({
  display_name: String(currentYear + i),
  value: currentYear + i,
}));

const getDaysForMonth = (month, year) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => ({
    display_name: String(i + 1),
    value: i + 1,
  }));
};

const hours = Array.from({ length: 12 }, (_, i) => ({
  display_name: String(i + 1),
  value: i + 1,
}));

const minutes = Array.from({ length: 61 }, (_, i) => ({
  display_name: String(i),
  value: i,
}));

const dayTime = [
  { display_name: "AM", value: "am" },
  { display_name: "PM", value: "pm" },
];

export default function DatePicker({
  close,
  onSelect,
  selected,
  remove = true,
}) {
  const dispatch = useDispatch();
  const now = selected ? new Date(selected * 1000) : new Date();

  const currentHour24 = now.getHours();
  const currentHour12 = currentHour24 % 12 || 12;
  const currentPeriod = currentHour24 >= 12 ? "pm" : "am";

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedHour, setSelectedHour] = useState(currentHour12);
  const [selectedMinute, setSelectedMinute] = useState(now.getMinutes());
  const [selectedDayPeriod, setSelectedDayPeriod] = useState(currentPeriod);

  const days = useMemo(
    () => getDaysForMonth(selectedMonth, selectedYear),
    [selectedMonth, selectedYear],
  );

  const convertTo24h = (hour, period) => {
    if (period === "pm" && hour !== 12) return hour + 12;
    if (period === "am" && hour === 12) return 0;
    return hour;
  };

  const getUnixTimestamp = ({ year, month, day, hour, minute, period }) => {
    const hour24 = convertTo24h(hour, period);
    return Math.floor(
      new Date(year, month - 1, day, hour24, minute, 0, 0).getTime() / 1000,
    );
  };

  const handleOnSelect = () => {
    const timestamp = getUnixTimestamp({
      year: selectedYear,
      month: selectedMonth,
      day: selectedDay,
      hour: selectedHour,
      minute: selectedMinute,
      period: selectedDayPeriod,
    });
    const now = Math.floor(Date.now() / 1000);
    if (timestamp <= now) {
      dispatch(
        setToast({ type: 2, desc: "Scheduled date must be in the future." }),
      );
    } else {
      onSelect(timestamp);
    }
  };

  return (
    <Overlay exit={close} width={500} id="date-picker" allowOverFlow={true}>
      <div
        className="box-pad-h box-pad-v fx-centered fx-col fx-start-h fx-start-v"
        style={{ overflow: "visible", gap: "1rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fit-container fx-centered">
          <h4>Pick a date</h4>
        </div>

        <p className="gray-c">Date</p>
        <div className="fit-container fx-scattered" style={{ gap: "8px" }}>
          <Select
            options={days}
            value={selectedDay}
            onChange={setSelectedDay}
            full={true}
            label="Day"
          />
          <Select
            options={months}
            value={selectedMonth}
            onChange={setSelectedMonth}
            full={true}
            label="Month"
          />
          <Select
            options={years}
            value={selectedYear}
            onChange={setSelectedYear}
            full={true}
            label="Year"
          />
        </div>

        <p className="gray-c">Time</p>
        <div className="fit-container fx-scattered" style={{ gap: "8px" }}>
          <Select
            options={hours}
            value={selectedHour}
            onChange={setSelectedHour}
            full={true}
            label="Hours"
          />
          <Select
            options={minutes}
            value={selectedMinute}
            onChange={setSelectedMinute}
            full={true}
            label="Minutes"
          />
          <Select
            options={dayTime}
            value={selectedDayPeriod}
            onChange={setSelectedDayPeriod}
            full={true}
            label="AM/PM"
          />
        </div>

        <div className="fit-container fx-gap-h fx-scattered">
          {selected && remove && (
            <Button
              label="Remove"
              type="red"
              full={true}
              onClick={() => onSelect(undefined)}
            />
          )}
          <Button
            label="Confirm"
            type="primary"
            full={true}
            onClick={handleOnSelect}
          />
        </div>
      </div>
    </Overlay>
  );
}
