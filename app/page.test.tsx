import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home page", () => {
  it("should render the welcome message", () => {
    render(<Home />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Welcome to your music library.")).toBeInTheDocument();
  });
});
