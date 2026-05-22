# Інструкція зі здачі (UA)

Коротко — що треба зробити, щоб здати цю контрольну.

## 1. Створи репозиторій на GitHub

```bash
cd ar-sievert
git init
git add .
git commit -m "Control task: AR Sievert surface"

# Створи репо на GitHub, потім:
git remote add origin https://github.com/<твій-логін>/<репо>.git
git branch -M main
git push -u origin main
```

## 2. Створи гілку `ControlTask`

За умовою завдання, **код повинен лежати в гілці з назвою `ControlTask`**:

```bash
git checkout -b ControlTask
git push -u origin ControlTask
```

## 3. Увімкни GitHub Pages

1. На GitHub → твій репо → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **`ControlTask`** → folder: **`/ (root)`** → **Save**
4. Через ~1 хв сайт буде на `https://<твій-логін>.github.io/<репо>/`

> AR.js обовʼязково вимагає **HTTPS** для доступу до камери на телефоні.
> GitHub Pages дає HTTPS безкоштовно.

## 4. Роздрукуй маркер

- Відкрий `assets/marker-sievert-print.png`
- Друкуй розміром **≈80×80 мм**
- Не обрізай чорну рамку!
- Приклей на ту саму поверхню/обʼєкт, що використовував у PA#1

## 5. Запиши відео-демо

1. Відкрий `https://<твій-логін>.github.io/<репо>/` на телефоні (Chrome / Safari)
2. Дозволь доступ до камери
3. Наведи камеру на роздрукований маркер
4. Запиши відео (15–30 секунд достатньо), як поверхня Сіверта зʼявляється над обʼєктом
5. Збережи відео як `assets/demo.mp4` і запуш у гілку `ControlTask`:

```bash
git add assets/demo.mp4
git commit -m "Add demo video"
git push
```

> Якщо відео велике (>100 МБ) — залий на YouTube/Google Drive, посилання
> додай у README.

## 6. Зроби скріншот з телефону

Скріншот з телефону, де видно поверхню над маркером → `assets/demo-screenshot.jpg`.
Завдання вимагає, щоб у репо було **і фото, і відео**.

## 7. Здай через Google Form

Посилання на форму — у тексті завдання
(`https://docs.google.com/forms/d/e/1FAIpQLSeL8uVGVVCoMF7or6s76mqlnVYVxbLWcDHsGKMB23wa-WUcyA/viewform`).
Вкажи URL свого GitHub-репо.

---

## Швидка перевірка перед здачею

- [ ] Репо публічний (інакше викладач не відкриє)
- [ ] Є гілка `ControlTask`
- [ ] У ній лежать: `index.html`, `js/`, `assets/pattern-sievert.patt`,
      `assets/marker-sievert.png`
- [ ] GitHub Pages працює — відкривається `https://...github.io/...`
- [ ] На сторінці камера запитує дозвіл, поверхня показується над маркером
- [ ] У `assets/` є демо-відео і скріншот
- [ ] Форму на Google Forms відправлено

---

## Якщо щось не працює

**Камера не вмикається** → відкрий через `https://`, не `http://`.

**Маркер не визначається** → перевір, що:
- роздрукований маркер має чорну рамку довкола білого квадрата
- освітлення нормальне (не контрове)
- маркер плаский (не загнутий)
- камера у фокусі

**Поверхня не зʼявляється, але "Marker locked ✓" світиться** →
відкрий DevTools у Chrome (USB-debugging з телефона) і подивись помилки
в консолі. Найімовірніше, шлях до `pattern-sievert.patt` неправильний
через case-sensitivity на GitHub Pages.

**Поверхня обертається не так як треба** → у `index.html` змінити
`position="0 0.2 0"` або повертати атрибут `rotation` на `<a-entity>`.
