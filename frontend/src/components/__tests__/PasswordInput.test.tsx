import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PasswordInput from "../PasswordInput";

describe("PasswordInput", () => {
  it("renders the current value", () => {
    render(<PasswordInput id="pwd" value="secret" onChange={() => {}} />);
    expect(screen.getByDisplayValue("secret")).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<PasswordInput id="pwd" value="" onChange={onChange} placeholder="senha" />);
    fireEvent.change(screen.getByPlaceholderText("senha"), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith("abc");
  });

  it("toggles visibility", () => {
    render(<PasswordInput id="pwd" value="secret" onChange={() => {}} />);
    const input = screen.getByDisplayValue("secret") as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: /mostrar senha/i }));
    expect(input.type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: /ocultar senha/i }));
    expect(input.type).toBe("password");
  });

  it("renders lock icon when requested", () => {
    const { container } = render(
      <PasswordInput id="pwd" value="" onChange={() => {}} withLockIcon />,
    );
    expect(container.querySelector("svg.lucide-lock")).not.toBeNull();
  });
});