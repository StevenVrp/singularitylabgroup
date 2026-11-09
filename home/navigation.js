const menu = document.getElementById("menu");
const navigation = document.getElementById("navigation");
const smallScreen = matchMedia("(max-width: 760px)");

function closeMenu() {
  const mobile = smallScreen.matches;
  menu.hidden = !mobile;
  menu.setAttribute("aria-expanded", "false");
  navigation.hidden = mobile;
}

menu.addEventListener("click", () => {
  navigation.hidden = !navigation.hidden;
  menu.setAttribute("aria-expanded", String(!navigation.hidden));
});
navigation.addEventListener("click", closeMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && smallScreen.matches && !navigation.hidden) {
    closeMenu();
    menu.focus();
  }
});
smallScreen.addEventListener("change", closeMenu);
closeMenu();
