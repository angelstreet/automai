'use client';

import React, { useState } from 'react';

const CalculatorWidget = () => {
  const [display, setDisplay] = useState('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);

  const handleDigit = (digit: string) => {
    if (waitingForSecondOperand) {
      setDisplay(digit);
      setWaitingForSecondOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const handleOperator = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (firstOperand === null) {
      setFirstOperand(inputValue);
    } else if (operator) {
      const result = calculate(firstOperand, inputValue, operator);
      setDisplay(String(result));
      setFirstOperand(result);
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (first: number, second: number, op: string): number => {
    switch (op) {
      case '+':
        return first + second;
      case '-':
        return first - second;
      case '*':
        return first * second;
      case '/':
        return second !== 0 ? first / second : 0;
      default:
        return second;
    }
  };

  const handleEquals = () => {
    if (firstOperand === null || operator === null) return;

    const inputValue = parseFloat(display);
    const result = calculate(firstOperand, inputValue, operator);
    setDisplay(String(result));
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };

  const handleClear = () => {
    setDisplay('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };

  const buttons = [
    { label: 'C', action: handleClear },
    { label: '/', action: () => handleOperator('/') },
    { label: '*', action: () => handleOperator('*') },
    { label: '-', action: () => handleOperator('-') },
    { label: '7', action: () => handleDigit('7') },
    { label: '8', action: () => handleDigit('8') },
    { label: '9', action: () => handleDigit('9') },
    { label: '+', action: () => handleOperator('+') },
    { label: '4', action: () => handleDigit('4') },
    { label: '5', action: () => handleDigit('5') },
    { label: '6', action: () => handleDigit('6') },
    { label: '=', action: handleEquals, rowSpan: true },
    { label: '1', action: () => handleDigit('1') },
    { label: '2', action: () => handleDigit('2') },
    { label: '3', action: () => handleDigit('3') },
    { label: '0', action: () => handleDigit('0'), colSpan: true },
    { label: '.', action: () => handleDigit('.') },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg w-56 h-64 relative p-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-2 text-center">Calculator</h3>
      <div className="bg-gray-100 p-2 mb-2 rounded text-right text-lg font-mono min-h-[32px] flex items-center justify-end">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-1 h-32">
        {buttons.slice(0, 4).map((btn, idx) => (
          <button
            key={idx}
            onClick={btn.action}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm font-medium"
          >
            {btn.label}
          </button>
        ))}
        {buttons.slice(4, 8).map((btn, idx) => (
          <button
            key={idx + 4}
            onClick={btn.action}
            className={`${
              btn.label === '+'
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            } rounded text-sm font-medium`}
          >
            {btn.label}
          </button>
        ))}
        {buttons.slice(8, 12).map((btn, idx) => (
          <button
            key={idx + 8}
            onClick={btn.action}
            className={`${
              btn.label === '='
                ? 'bg-blue-500 hover:bg-blue-600 text-white row-span-2'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            } rounded text-sm font-medium`}
          >
            {btn.label}
          </button>
        ))}
        <button
          onClick={buttons[12].action}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"
        >
          {buttons[12].label}
        </button>
        <button
          onClick={buttons[13].action}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"
        >
          {buttons[13].label}
        </button>
        <button
          onClick={buttons[14].action}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium col-span-2"
        >
          {buttons[14].label}
        </button>
        <button
          onClick={buttons[15].action}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"
        >
          {buttons[15].label}
        </button>
      </div>
    </div>
  );
};

export default CalculatorWidget;
