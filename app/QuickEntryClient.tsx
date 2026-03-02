"use client";

import { useState } from "react";
import tabStyles from "./QuickEntry.module.css";
import { Card, CardHeader } from "./components/Card";
import Button from "./components/Button";
import FormInput from "./components/FormInput";
import CurrencyInput from "./components/CurrencyInput";
import FormSelect from "./components/FormSelect";
import FormTextarea from "./components/FormTextarea";
import CategoryTag from "./components/CategoryTag";
import { useToast } from "./components/ToastProvider";
import { CONFIG } from "../lib/config";
import { TABS } from "./constants/quickEntry";
import {
  useExpenseForm,
  useIncomeForm,
  useSavingsForm,
  useInvestmentForm,
} from "./hooks/useQuickEntryForms";

export default function QuickEntryClient() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("expense");

  const expense = useExpenseForm(showToast);
  const income = useIncomeForm(showToast);
  const savings = useSavingsForm(showToast);
  const investment = useInvestmentForm(showToast);

  const isLoading =
    expense.loading || income.loading || savings.loading || investment.loading;

  return (
    <>
      <div className={tabStyles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${tabStyles.tab}${activeTab === tab.id ? ` ${tabStyles.active}` : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "expense" && (
        <Card>
          <CardHeader title="지출 기록하기" icon="💸">
            <span className="text-gray-light font-light">
              오늘 쓴 돈을 기록해보세요
            </span>
          </CardHeader>
          <form onSubmit={expense.handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                type="date"
                label="📅 날짜"
                value={expense.form.date}
                onChange={(e) =>
                  expense.setForm({ ...expense.form, date: e.target.value })
                }
                required
              />
              <CurrencyInput
                label="💵 금액"
                placeholder="15,000"
                value={expense.form.amount}
                onChange={(e) =>
                  expense.setForm({ ...expense.form, amount: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">🏷️ 카테고리</label>
              <CategoryTag
                categories={CONFIG.DEFAULT_CATEGORIES.expense}
                selectedCategory={expense.category}
                onSelectCategory={expense.setCategory}
              />
            </div>
            <FormTextarea
              label="📝 메모"
              placeholder="무엇을 구매하셨나요?"
              value={expense.form.memo}
              onChange={(e) =>
                expense.setForm({ ...expense.form, memo: e.target.value })
              }
            />
            <Button type="submit" variant="primary" block>
              ✍️ 지출 기록하기
            </Button>
          </form>
        </Card>
      )}

      {activeTab === "income" && (
        <Card>
          <CardHeader title="Income 기록하기" icon="💰">
            <span className="text-gray-light font-light">
              들어온 돈을 기록해보세요
            </span>
          </CardHeader>
          <form onSubmit={income.handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                type="date"
                label="📅 날짜"
                value={income.form.date}
                onChange={(e) =>
                  income.setForm({ ...income.form, date: e.target.value })
                }
                required
              />
              <CurrencyInput
                label="💵 금액"
                placeholder="3,500,000"
                value={income.form.amount}
                onChange={(e) =>
                  income.setForm({ ...income.form, amount: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">🏷️ 카테고리</label>
              <CategoryTag
                categories={CONFIG.DEFAULT_CATEGORIES.income}
                selectedCategory={income.category}
                onSelectCategory={income.setCategory}
              />
            </div>
            <FormTextarea
              label="📝 메모"
              placeholder="어디서 받으셨나요?"
              value={income.form.memo}
              onChange={(e) =>
                income.setForm({ ...income.form, memo: e.target.value })
              }
            />
            <Button type="submit" variant="primary" block>
              ✍️ Income 기록하기
            </Button>
          </form>
        </Card>
      )}

      {activeTab === "savings" && (
        <Card>
          <CardHeader title="Savings 기록하기" icon="🏦">
            <span className="text-gray-light font-light">
              모은 돈을 기록해보세요
            </span>
          </CardHeader>
          <form onSubmit={savings.handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                type="date"
                label="📅 날짜"
                value={savings.form.date}
                onChange={(e) =>
                  savings.setForm({ ...savings.form, date: e.target.value })
                }
                required
              />
              <CurrencyInput
                label="💵 금액"
                placeholder="500,000"
                value={savings.form.amount}
                onChange={(e) =>
                  savings.setForm({ ...savings.form, amount: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">🏷️ Savings 종류</label>
              <CategoryTag
                categories={CONFIG.DEFAULT_CATEGORIES.savings}
                selectedCategory={savings.category}
                onSelectCategory={savings.setCategory}
              />
            </div>
            <FormInput
              type="text"
              label="🏦 계좌명 (선택)"
              placeholder="예: 청년적금, 비상금통장"
              value={savings.form.account}
              onChange={(e) =>
                savings.setForm({ ...savings.form, account: e.target.value })
              }
            />
            <FormTextarea
              label="📝 메모"
              placeholder="어디에 Savings하셨나요?"
              value={savings.form.memo}
              onChange={(e) =>
                savings.setForm({ ...savings.form, memo: e.target.value })
              }
            />
            <Button type="submit" variant="primary" block>
              ✍️ Savings 기록하기
            </Button>
          </form>
        </Card>
      )}

      {activeTab === "investment" && (
        <Card>
          <CardHeader title="Invest 기록하기" icon="📈">
            <span className="text-gray-light font-light">
              Invest 내역을 기록해보세요
            </span>
          </CardHeader>
          <form onSubmit={investment.handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                type="date"
                label="📅 날짜"
                value={investment.form.date}
                onChange={(e) =>
                  investment.setForm({ ...investment.form, date: e.target.value })
                }
                required
              />
              <FormSelect
                label="📊 거래유형"
                value={investment.form.type}
                onChange={(e) =>
                  investment.setForm({ ...investment.form, type: e.target.value })
                }
                required
              >
                <option value="">선택하세요</option>
                <option value="매수">매수</option>
                <option value="매도">매도</option>
                <option value="입금">💵 입금</option>
                <option value="출금">💸 출금</option>
              </FormSelect>
            </div>
            {investment.form.type !== "입금" && investment.form.type !== "출금" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    type="text"
                    label="🔑 종목 ID"
                    placeholder="예: AAPL, 005930"
                    value={investment.form.assetId}
                    onChange={(e) =>
                      investment.setForm({ ...investment.form, assetId: e.target.value })
                    }
                    required
                  />
                  <FormInput
                    type="text"
                    label="🏷️ 종목명"
                    placeholder="예: 애플, 삼성전자"
                    value={investment.form.assetName}
                    onChange={(e) =>
                      investment.setForm({ ...investment.form, assetName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormInput
                    type="number"
                    label="📦 수량"
                    placeholder="10"
                    min="0"
                    step="0.0001"
                    value={investment.form.quantity}
                    onChange={(e) =>
                      investment.setForm({ ...investment.form, quantity: e.target.value })
                    }
                    required
                  />
                  <FormSelect
                    label="💱 통화"
                    value={investment.form.currency}
                    onChange={(e) =>
                      investment.setForm({ ...investment.form, currency: e.target.value })
                    }
                    required
                  >
                    <option value="KRW">KRW (원)</option>
                    <option value="USD">USD (달러)</option>
                  </FormSelect>
                  <FormSelect
                    label="🌍 시장"
                    value={investment.form.market}
                    onChange={(e) =>
                      investment.setForm({ ...investment.form, market: e.target.value })
                    }
                    required
                  >
                    <option value="KR">🇰🇷 한국</option>
                    <option value="US">🇺🇸 미국</option>
                  </FormSelect>
                </div>
              </>
            )}
            {(investment.form.type === "입금" || investment.form.type === "출금") && (
              <FormSelect
                label="💱 통화"
                value={investment.form.currency}
                onChange={(e) =>
                  investment.setForm({ ...investment.form, currency: e.target.value })
                }
                required
              >
                <option value="KRW">KRW (원)</option>
                <option value="USD">USD (달러)</option>
              </FormSelect>
            )}
            {investment.form.currency === "KRW" ? (
              <CurrencyInput
                label="💵 거래금액"
                placeholder="1,000,000"
                value={investment.form.amount}
                onChange={(e) =>
                  investment.setForm({ ...investment.form, amount: e.target.value })
                }
                required
              />
            ) : (
              <FormInput
                type="number"
                label="💵 거래금액"
                placeholder="1000.00"
                min="0"
                step="0.01"
                value={investment.form.amount}
                onChange={(e) =>
                  investment.setForm({ ...investment.form, amount: e.target.value })
                }
                required
              />
            )}
            <FormTextarea
              label="📝 메모"
              placeholder="거래 메모"
              value={investment.form.memo}
              onChange={(e) =>
                investment.setForm({ ...investment.form, memo: e.target.value })
              }
            />
            <Button type="submit" variant="primary" block>
              ✍️ Invest 기록하기
            </Button>
          </form>
        </Card>
      )}

      {isLoading && (
        <div
          className={tabStyles.spinner}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            zIndex: 9999,
          }}
        />
      )}
    </>
  );
}
