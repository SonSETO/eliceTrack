import express, { NextFunction, Request, Response } from "express";
import UserService from "./user.service";
import { generateToken, verifyToken } from "../../utils/jwt";
import { User } from "./user.schema";
import jwt from "jsonwebtoken";

const UserController = {
  register: async (
    req: Request,
    res: Response<{ message: string; data?: any }>,
    next: NextFunction
  ) => {
    try {
      const { ...userData } = req.body;
      const filePath = req.file?.path;

      const newUser = await UserService.register(userData, filePath);

      return res.status(201).send({ message: "회원가입 성공", data: newUser });
    } catch (err) {
      next(err);
    }
  },

  // 회원가입 시 인비테이션 토큰 발급 소속팀 회원가입 페이지 보면서 해야할 듯
  // sendTeamConfirmationEmail: async (
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ) => {
  //   try {
  //     const { userId } = req.body;

  //     if (!userId) {
  //       return res
  //         .status(400)
  //         .send({ message: "Bad Request+userId가 필요합니다." });
  //     }

  //     const user = await User.findById(userId);
  //     if (!user) {
  //       return res
  //         .status(404)
  //         .send({ message: "Not Found+사용자를 찾을 수 없습니다." });
  //     }

  //     const token = jwt.sign(
  //       { id: user._id },
  //       process.env.JWT_SECRET || "confirmationToken",
  //       { expiresIn: "1d" }
  //     );

  //     await UserService.sendTeamConfirmationEmail(user, token);

  //     res
  //       .status(200)
  //       .send({ message: "팀 소속 확인 이메일이 전송되었습니다." });
  //   } catch (err) {
  //     next(err);
  //   }
  // },
  confirmTeam: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      const { team } = req.body;

      const updatedUser = await UserService.confirmTeam(token, team);

      res
        .status(200)
        .send({ message: "팀 소속 업데이트 성공", data: updatedUser });
    } catch (err) {
      next(err);
    }
  },
  logIn: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken, team } = await UserService.logIn(
        email,

        password
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).send({
        message: "로그인 성공",
        data: {
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          team: team,
        },
        accessToken,
      });
    } catch (err) {
      next(err);
    }
  },
  refreshAccessToken: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ message: "리프레시 토큰이 필요합니다." });
      }

      const decoded = verifyToken(refreshToken);
      const userId = (decoded as any).userId;

      const newAccessToken = generateToken(userId);
      res.status(200).send({ accessToken: newAccessToken });
    } catch (err) {
      next(err);
    }
  },
  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        res.status(400).send({ message: "로그아웃할 유저가 없습니다." });
      }
      await UserService.logout(refreshToken);
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });
      res.status(200).send({ message: "로그아웃 성공" });
    } catch (err) {
      next(err);
    }
  },

  requestPasswordReset: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.body;

      await UserService.requestPasswordReset(email);

      res
        .status(200)
        .send({ message: "비밀번호 재설정 이메일이 전송되었습니다." });
    } catch (err) {
      next(err);
    }
  },

  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body;

      await UserService.resetPassword(token, newPassword);

      res
        .status(200)
        .send({ message: "비밀번호가 성공적으로 변경되었습니다." });
    } catch (err) {
      next(err);
    }
  },

  updateUserInformation: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      if (req.file) {
        updateData.avatar = req.file.path;
      }

      await UserService.updateUserInformation(userId, updateData);

      res.status(200).send({ message: "유저 정보 수정 성공" });
    } catch (err) {
      next(err);
    }
  },

  findUser: async (
    req: Request,
    res: Response<{ message: string; data?: any }>,
    next: NextFunction
  ) => {
    try {
      const { searchInfo } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const userId = res.locals.userId;

      const users = await UserService.getUser(
        searchInfo as string,
        userId,
        page,
        limit
      );
      res.status(200).send({ message: "유저 검색 성공", data: users });
    } catch (e) {
      next(e);
    }
  },

  getAllUsers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const users = await UserService.getAllUsers(page, limit);
      res.status(200).send({ message: "모든 유저 조회 성공", data: users });
    } catch (err) {
      next(err);
    }
  },
};
export default UserController;
